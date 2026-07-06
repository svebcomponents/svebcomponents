# @svebcomponents/auto-options

## 0.0.5

### Patch Changes

- cefe6cb: Fix inferred props declared only via `<svelte:options customElement={{props: {...}}}>` (without an `attribute` field and without a matching `$props()` destructure) emitting `attribute: "undefined"` instead of falling back to the kebab-cased prop name.
- bea7309: Route build warnings through `console.warn` with a consistent `[svebcomponents/auto-options]` prefix, resolve union prop types (e.g. `string | null`, `number | undefined`, literal unions) without spurious "unhandled type" warnings, and omit function- and `Snippet`-typed props from the generated custom element props so they stay property-only instead of receiving meaningless attribute/reflect metadata.
- 724f00a: Declare supported Node versions (`engines.node: ">=20.19.0"`) so consumers get a clear error instead of an opaque runtime failure on unsupported Node versions.
- e7e4adf: Fix publint compliance: put the `types` export condition first so TypeScript resolves declarations as published, add `files` fields so tarballs only ship `dist` (and `bin.js` for the build package), and run publint as part of every publishable package's build.
- 4c038c3: Fix crash when using `<svelte:options customElement="tagName"/>` (the string variant); it now emits the unsupported-variant warning without throwing, and leaves svelte:options untouched.
- ac6e095: Fix Windows portability issues:

  - `@svebcomponents/build` now uses `path.posix` consistently in
    `inferComponents`. The values flowing through it come from package.json
    `exports` (always posix) and become generated import specifiers, which must
    stay posix. Previously `path.normalize` could flip them to backslashes on
    win32. `existsSync` filesystem checks remain safe because Node's fs APIs
    accept forward slashes on Windows.
  - `@svebcomponents/auto-options` build script no longer relies on `rm -rf`,
    which fails on Windows cmd/PowerShell. It now uses a portable `node -e`
    `fs.rmSync` call to clean stale `dist` output before `tsc`.

- Updated dependencies [9be6326]
- Updated dependencies [724f00a]
- Updated dependencies [e7e4adf]
- Updated dependencies [d2094d2]
  - @svebcomponents/utils@0.0.3

## 0.0.4

### Patch Changes

- 1c5b92f: refactor!: migrate to rolldown

  since the minification logic of rolldown is different than rollup & rolldown is also still in beta, this is a breaking change

## 0.0.3

### Patch Changes

- 8aa8512: fix: publish private utils dependency
- Updated dependencies [8aa8512]
  - @svebcomponents/utils@0.0.2

## 0.0.2

### Patch Changes

- 5cedd02: fix: set dependencies correctly
