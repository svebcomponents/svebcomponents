# @svebcomponents/utils

## 0.0.3

### Patch Changes

- 9be6326: Allow digits in `isKebabCase` so attribute names like `col-2` or `heading2` are correctly detected as attributes, fixing SSR/client markup divergence.
- 724f00a: Declare supported Node versions (`engines.node: ">=20.19.0"`) so consumers get a clear error instead of an opaque runtime failure on unsupported Node versions.
- e7e4adf: Fix publint compliance: put the `types` export condition first so TypeScript resolves declarations as published, add `files` fields so tarballs only ship `dist` (and `bin.js` for the build package), and run publint as part of every publishable package's build.
- d2094d2: Remove the unused `TODO()` helper export and its README documentation. Nothing in the repo (or any published svebcomponents package) called it — it was dead code that only logged to the console. Strictly speaking, dropping an export is a breaking change, but the package is 0.x and the helper was documented as internal/experimental, so this ships as a patch.

## 0.0.2

### Patch Changes

- 8aa8512: fix: publish private utils dependency
