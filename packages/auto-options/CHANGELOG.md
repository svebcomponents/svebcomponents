# @svebcomponents/auto-options

## 0.1.0

### Minor Changes

- c2f1b6c: Only reflect scalar props to attributes by default.

  Previously every inferred prop defaulted to `reflect: true`, including `Object` and `Array` props and props whose type couldn't be resolved. Reflecting a non-scalar prop serializes the whole value into an attribute on every change — an anti-pattern that, for large values (e.g. a preloaded data object), writes hundreds of KB of JSON onto the host element. It also forced components with such a prop to hand-write `<svelte:options customElement>` just to opt out, which in turn dropped the component's CSS from SSR output (a flash of unstyled content).

  Now:

  - `String` / `Number` / `Boolean` props reflect by default (unchanged).
  - `Object` / `Array` props default to `reflect: false`.
  - Props whose type couldn't be resolved (typically an imported type) fall back to the `String` converter but also default to `reflect: false`, since an unresolved type is almost never a scalar meant for an attribute.

  Explicit `reflect` values in `<svelte:options customElement={{ props }}>` are still honored, so this only changes the inferred default.

- c2f1b6c: Hydratable custom elements: server-rendered declarative shadow DOM is now **hydrated** instead of being wiped and re-rendered when the element upgrades.

  Previously, svelte's generated custom element always called `attachShadow` (clearing the declarative shadow root per spec) and then `mount`ed the component from scratch — losing the server-rendered DOM, transient state, and re-creating every node. Now, `@svebcomponents/build` compiles components as hydratable by default:

  - `@svebcomponents/auto-options` injects svelte's official `customElement.extend` hook wired to the new `hydratable` wrapper from `@svebcomponents/ssr/hydration`.
  - The wrapper claims the declarative shadow root before svelte can clear it and hydrates it via svelte's public `hydrate()` API — the server-rendered nodes are adopted in place, styles are deduped by svelte itself, and the component is fully reactive afterwards.
  - On the server, the generated SSR entry renders through a `HydrationHost` component (also used on the client) so the markup structure matches by construction.
  - Anything non-hydratable — no declarative shadow root, slotted components, reconnection after teardown — falls back to svelte's untouched mount path, and svelte's own hydration mismatch recovery re-mounts, so a failed hydration degrades to exactly the previous behavior.

  Opt out per package with `defineConfig({ hydratable: false })` (or per component by declaring your own `extend`). Client custom-element bundles are now built with `platform: "browser"`, so browser export conditions resolve correctly.

  Known limitations (fall back to mount): components with slots (expected to become hydratable with Svelte 6, when slots are no longer compiled through the legacy transformation — a dev-mode `console.info` makes the fallback visible); legacy `createEventDispatcher` events on hydrated elements (native `$host()` events are unaffected); component `export`s are not exposed on hydrated hosts. See the new [Hydration docs](https://svebcomponents.dev/core-concepts/hydration/) for details.

### Patch Changes

- Updated dependencies [c2f1b6c]
  - @svebcomponents/utils@0.1.0

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
