# meteor-rspack-fullapp-repro

Minimal reproduction for a follow-on bug after the [meteor#14055](https://github.com/meteor/meteor/issues/14055) fix shipped in **Meteor 3.4.1**.

## What's broken

Running `meteor test --full-app` on a Meteor 3.4.1 app that uses the Rspack bundler and declares both `meteor.mainModule.server` and `meteor.testModule.server` in `package.json` fails at build time with:

```
=> Build failed:
   While building the application:
   error: Could not find mainModule for 'os' architecture:
   _build/test/server-meteor.js
   Check the "meteor" section of your package.json file?
```

In `--full-app` mode the rspack plugin remaps `mainModule.server` to the test entry file (`_build/test/server-meteor.js`) so the main and test entries share one bundle (this was the 14055 fix). The file is created on disk by `ensureModuleFilesExist()` before Meteor scans sources, but `tools/isobuild/package-source.js:_findSources` doesn't include the path in its source list, so the `missingMainModule` check fires.

Dev mode (`meteor run`) is fine. The bug is specific to `meteor test --full-app`.

## Versions

- `METEOR@3.4.1`
- `rspack@1.1.0` (the Meteor package, pulled by `meteor update --release 3.4.1`)
- `@meteorjs/rspack@2.0.1`
- Node 22.x

## Repro

```bash
git clone https://github.com/miamagana/meteor-rspack-fullapp-repro
cd meteor-rspack-fullapp-repro
meteor npm install
meteor npm test
```

The full failing output is captured in `repro.txt`.

## Expected

Build proceeds, `meteortesting:mocha` runs, and the single trivial assertion in `test/server/main.js` passes.

## Layout

- `server/main.js` — declares one `Mongo.Collection`.
- `test/server/main.js` — imports the collection and asserts it is defined.
- `package.json` — declares both `mainModule.server` and `testModule.server`.

That's the whole app. No client logic, no React, no extra packages.
