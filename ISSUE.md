# Draft upstream issue text

> Paste as a comment on [meteor/meteor#14055](https://github.com/meteor/meteor/issues/14055), or as a new issue cross-linking it.

---

**Title:** `[Rspack 3.4.1] meteor test --full-app fails: Could not find mainModule for _build/test/server-meteor.js`

Hi, follow-on bug after the #14055 fix landed in 3.4.1.

On an app that declares both `meteor.mainModule.server` and `meteor.testModule.server`, `meteor test --full-app` fails at build time:

```
=> Build failed:
   While building the application:
   error: Could not find mainModule for 'os' architecture:
   _build/test/server-meteor.js
   Check the "meteor" section of your package.json file?
```

Dev mode (`meteor run`) is fine, so the failure is specific to `--full-app`.

## Repro

https://github.com/miamagana/meteor-rspack-fullapp-repro (~10 files)

```bash
git clone https://github.com/miamagana/meteor-rspack-fullapp-repro
cd meteor-rspack-fullapp-repro
meteor npm install
meteor npm test
```

Full output in [`repro.txt`](https://github.com/miamagana/meteor-rspack-fullapp-repro/blob/master/repro.txt).

## Versions

`METEOR@3.4.1`, `rspack@1.1.0`, `@meteorjs/rspack@2.0.1`, Node 22.x. Reproduces on macOS arm64 and Linux x64 (GitHub Actions).

## What I think is happening

In `--full-app` mode `@meteorjs/rspack/lib/config.js` remaps `mainServer` to the test entry file so both entries share one bundle (the 14055 fix). The file is on disk by the time Meteor scans, but `tools/isobuild/package-source.js:_findSources` doesn't return it for the `os` arch, so `missingMainModule` stays true and the check at `package-source.js:1002` fires.

Renaming the build context (`meteor.buildContext: "build"`) doesn't help, so it isn't the leading underscore.

Happy to help debug. I can run patches against the repro, share more logs, or test a candidate fix against the original app this surfaced on ([CodeSignal/codesignal#39621](https://github.com/CodeSignal/codesignal/pull/39621)). Ping me anytime.
