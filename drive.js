// Drives the running full-app test server with headless Chromium and reports
// whether the client Rspack bundle booted. Usage: node drive.js <url>
const path = require('path');

function loadPuppeteer() {
  const candidates = [
    'puppeteer',
    path.join(process.env.METEOR_HOME || '', 'dev_bundle/lib/node_modules/puppeteer'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch (_) {}
  }
  throw new Error('puppeteer not found');
}

(async () => {
  const url = process.argv[2] || 'http://localhost:4100/';
  const puppeteer = loadPuppeteer();
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const scripts = [];
  page.on('response', r => {
    const u = r.url();
    if (u.includes('/__rspack__/') || u.includes('client-rspack')) {
      scripts.push(`${r.status()} ${u}`);
    }
  });
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e)));

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  // give client bundle a beat to execute
  await new Promise(res => setTimeout(res, 1500));

  const booted = await page.evaluate(() => window.__CLIENT_BOOTED__);
  const greeting = await page.evaluate(
    () => (document.querySelector('#greeting') || {}).textContent || null
  );
  const injected = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script'))
      .map(s => s.getAttribute('src'))
      .filter(s => s && s.includes('__rspack__'))
  );

  console.log(JSON.stringify({
    url,
    __CLIENT_BOOTED__: booted,
    greeting,
    injectedRspackScripts: injected,
    rspackNetworkResponses: scripts,
    pageErrors: consoleErrors,
  }, null, 2));

  await browser.close();
})().catch(e => { console.error('DRIVE_ERROR', e); process.exit(1); });
