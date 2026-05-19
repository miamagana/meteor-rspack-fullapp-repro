# Draft upstream issue text

> Paste this either as a comment on [meteor/meteor#14055](https://github.com/meteor/meteor/issues/14055) or as a new issue. Not posted automatically.

---

**Title:** `[Rspack 3.4.1] meteor test --full-app fails: Could not find mainModule for _build/test/server-meteor.js`

## Summary

After upgrading to Meteor 3.4.1 (which closed #14055), `meteor test --full-app` fails at build time with a `Could not find mainModule for 'os' architecture` error on apps that declare both `meteor.mainModule.server` and `meteor.testModule.server` in `package.json`.

Dev mode (`meteor run`) builds and starts fine. The failure is specific to `--full-app` test mode.

## Repro

https://github.com/miamagana/meteor-rspack-fullapp-repro

```bash
git clone https://github.com/miamagana/meteor-rspack-fullapp-repro
cd meteor-rspack-fullapp-repro
meteor npm install
meteor npm test
```

The repo is ~10 files: one collection in `server/main.js`, one mocha assertion in `test/server/main.js`, the standard rspack scaffold. No app code beyond that.

## Versions

- `METEOR@3.4.1`
- `rspack@1.1.0` (Meteor package, pinned in `.meteor/versions` after `meteor update --release 3.4.1`)
- `@meteorjs/rspack@2.0.1`
- Node 22.x
- macOS arm64 (also observed on Linux x64 via GitHub Actions runners)

## Observed

```
=> Build failed:
   While building the application:
   error: Could not find mainModule for 'os' architecture:
   _build/test/server-meteor.js
   Check the "meteor" section of your package.json file?
```

Full output: [`repro.txt`](https://github.com/miamagana/meteor-rspack-fullapp-repro/blob/master/repro.txt).

## Expected

Build proceeds, `meteortesting:mocha` loads, and the trivial assertion in `test/server/main.js` passes.

## Analysis

The 3.4.1 fix for #14055 remaps `mainModule.server` to the test entry file (`_build/test/server-meteor.js`) in `--full-app` mode, so both the main and test entries share one bundle:

```js
// @meteorjs/rspack/lib/config.js
if (isMeteorAppTestFullApp()) {
  appEntrypoints = {
    ...appEntrypoints,
    mainClient: `${RSPACK_BUILD_CONTEXT}/${testClientModule}`,
    mainServer: `${RSPACK_BUILD_CONTEXT}/${testServerModule}`,
  };
}
```

The file is created on disk by `ensureModuleFilesExist()` before Meteor's build proceeds. However `tools/isobuild/package-source.js:_findSources` doesn't include the path in its source list for the `os` arch, so `missingMainModule` stays true and `buildmessage.error("Could not find mainModule for 'os' architecture: ...")` fires (around `package-source.js:1002`).

Things I confirmed don't matter:
- The `_build` directory name (renamed via `meteor.buildContext: "build"` — same failure with `build/test/server-meteor.js`).
- `.meteorignore` / `.gitignore` content (`_build` isn't excluded from either by default; Meteor's source scanner only ignores dotfiles plus the patterns in `bundler.js:exports.ignoreFiles`).
- File creation timing — the file exists on disk by the time the scan runs (verified via `ls _build/test/`).

The original CodeSignal app where this surfaced is at https://github.com/CodeSignal/codesignal/pull/39621 if you want a larger-scale data point.

## Workaround?

I haven't found one. Patching the plugin to skip the `mainServer` remap reverts to the two-bundle topology and brings back the original "There is already a collection named X" error from #14055.

Happy to test any patches.
