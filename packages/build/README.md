Package Svelte custom elements with the `svebcomponents` command. Svelte
compiles each component and generates its custom element class. This package
configures the build around that output:

- browser and server Svelte compiler targets
- `@svebcomponents/auto-options` adds inferred props to
  `<svelte:options customElement={...} />` before compilation.
- The browser build prevents duplicate custom element registration.
- tsdown emits type declarations with the JavaScript output.
- `@svebcomponents/ssr/tsdown` can generate an SSR build.
- A `svelte` condition can share the host's Svelte runtime.

## Installation

```bash
pnpm add -D @svebcomponents/build
```

Installing it puts a `svebcomponents` executable on your `PATH`. Wire it to a
build script:

```json
{
  "scripts": {
    "build": "svebcomponents"
  }
}
```

## Zero-config Builds

Describe component entrypoints in `package.json` exports:

```json
{
  "exports": {
    ".": {
      "types": "./dist/client/ExampleComponent.d.ts",
      "svelte": "./dist/client-svelte/ExampleComponent.js",
      "default": "./dist/client/ExampleComponent.js"
    },
    "./ssr": {
      "types": "./dist/server/ssr.d.ts",
      "svelte": "./dist/server-svelte/ssr.js",
      "default": "./dist/server/ssr.js"
    }
  }
}
```

Then run the command:

```bash
svebcomponents
```

It looks for exports whose `default` or `import` condition points at
`./dist/client/*`, maps each output basename into `src`, and classifies the
matching source by extension:

- `src/<name>.svelte` is compiled as a svebcomponent.
- `src/<name>.ts` or `src/<name>.js` is built as an ordinary module, without
  the custom-element, hydration, or component SSR pipeline.

Exactly one matching source must exist. Ambiguous basenames fail the build and
can be expressed with an explicit configuration instead.

For the example above, `./dist/client/ExampleComponent.js` maps to
`src/ExampleComponent.svelte` and produces:

- `dist/client/ExampleComponent.js` for the standalone browser custom element entrypoint.
- `dist/client/ExampleComponent.d.ts` for TypeScript consumers.
- `dist/client-svelte/ExampleComponent.js` for Svelte-aware tooling because the `svelte` condition exists.
- `dist/server/*` for the server-renderable build because the matching `./ssr` export exists.
- `dist/server-svelte/*` for Svelte-aware SSR tooling because the `./ssr` export also has a `svelte` condition.

Without a matching SSR export, the CLI generates a browser build for the
component. It builds ordinary modules without component SSR output.

### Server preparation

An SSR-enabled entrypoint can prepare properties before rendering by adding an
adjacent `.ssr` module. For `src/ExampleComponent.svelte`, create
`src/ExampleComponent.ssr.ts` and export an `SsrPrepare` function as the default
export:

```ts
import type { SsrPrepare } from "@svebcomponents/ssr";

const prepare: SsrPrepare = ({ props, setProperty }) => {
  if (props.data !== undefined || typeof props.source !== "string") return;

  return fetchData(props.source).then((data) => {
    setProperty("data", data);
  });
};

export default prepare;
```

The build includes this file in the server output. It serializes properties set
by the hook so hydratable components can reuse them in the browser. Return
without a promise when preparation does not need async work; a promise requires
an async host.

## Browser bundle contents

Apps load `dist/client` from a URL or a bundle that has resolved its imports.
The browser builds inline each bare specifier, whether `package.json` lists it
as a `dependency` or `devDependency`.

Dependency classification controls what consumers install. The build fails when
it cannot resolve a specifier selected for inlining.

Left external: Node builtins (a browser bundle importing `node:fs` is broken
either way), relative and absolute paths, and protocol imports.

Declare packages that consumers need as dependencies. The browser build still
includes their code:

```json
{
  "dependencies": { "my-data-package": "^1.0.0" }
}
```

Declaring `svelte` also keeps the runtime in the standalone build.

### Opting out

List a dependency in `neverBundle` when the host must provide it:

```json
{
  "svebcomponents": { "neverBundle": ["@acme/design-system"] }
}
```

Entries are matched against the whole import specifier, so cover subpaths too if
the package has them (`["@acme/design-system", "@acme/design-system/**"]`).

Server output is unaffected by any of this: Node resolves declared dependencies
at runtime, so it keeps ordinary externalization.

## Svelte Template Types

Each build writes a `svelte/elements` augmentation beside the entry's
declarations. It makes unknown attributes and `increments={"nope"}` type
errors:

```
dist/client/ExampleComponent.svelte-types.d.ts
```

It covers kebab-case attributes and camelCase properties assigned through
expressions such as `preloadedData={value}`.

It lives in its own file because loading it requires svelte: it augments
`svelte/elements`, and a consumer without svelte installed cannot resolve that.

**If your package requires Svelte from consumers** through a `dependency` or a
`peerDependency` not marked optional) the entry's declarations reference it, and
your Svelte consumers need no setup.

For packages that work without Svelte, expose the augmentation as an opt-in.
The build prints the required export:

```json
{
  "exports": {
    "./svelte": { "types": "./dist/client/ExampleComponent.svelte-types.d.ts" }
  }
}
```

Consumers import it from a `.d.ts` file:

```ts
// app.d.ts
import "my-components/svelte";
```

Svelte template types do not require the package or all its consumers to
install Svelte.

React and Vue consumers write their own augmentation from the exported types.
See [typing elements in React & Vue](https://svebcomponents.dev/guides/framework-types/).

## Svelte Conditional Exports

The `svelte` condition provides a lighter build for consumers that already use
Svelte. It leaves `svelte` and `svelte/*` imports external, allowing
Svelte-aware tooling such as SvelteKit and `@sveltejs/vite-plugin-svelte` to
reuse the host application's runtime.

Other consumers fall back to `default`, which includes the Svelte runtime and
can run outside Svelte applications.

The `svelte` export relies on private Svelte runtime APIs. A patch or minor
release can break compiled output. Build the component package and host with
the same Svelte version, or use the standalone `default` build.

## Multiple Components

Each export that points into `dist/client` is classified from its
same-basename source file.

```json
{
  "exports": {
    ".": {
      "types": "./dist/client/ExampleComponent.d.ts",
      "svelte": "./dist/client-svelte/ExampleComponent.js",
      "default": "./dist/client/ExampleComponent.js"
    },
    "./color-picker": {
      "types": "./dist/client/ColorPicker.d.ts",
      "svelte": "./dist/client-svelte/ColorPicker.js",
      "default": "./dist/client/ColorPicker.js"
    },
    "./color-picker/ssr": {
      "types": "./dist/server/ColorPicker.ssr.d.ts",
      "svelte": "./dist/server-svelte/ColorPicker.ssr.js",
      "default": "./dist/server/ColorPicker.ssr.js"
    }
  }
}
```

This builds `src/ExampleComponent.svelte` as a browser-only component, and
`src/ColorPicker.svelte` as both a browser and SSR component. Each `svelte`
condition also gets a Svelte-aware build in the matching `*-svelte` output
directory. A sibling export targeting `dist/client/helpers.js` would build
`src/helpers.ts` as an ordinary module.

## Manual Configuration

Create `svebcomponents.config.ts` when package export inference is not enough.

```ts
import { defineConfig } from "@svebcomponents/build";

export default defineConfig({
  entry: "src/ExampleComponent.svelte",
  outDir: "dist/client",
  svelteOutDir: "dist/client-svelte",
  ssr: true,
  ssrOutDir: "dist/server",
  ssrSvelteOutDir: "dist/server-svelte",
});
```

`defineConfig` returns an array of `tsdown` options with two builds:

- a browser build from `src/ExampleComponent.svelte` to `dist/client`
- an SSR build from `src/ExampleComponent.svelte` to `dist/server`

Set `svelteOutDir` and `ssrSvelteOutDir` to emit builds that externalize Svelte
runtime imports.

Set `ssr: false` to emit a browser custom element build without an SSR build.

A config file replaces export inference for the whole package, so a package
with several components exports one `defineConfig` call per component,
flattened:

```ts
export default [
  ...defineConfig({ entry: "src/FavoriteNumber.svelte" }),
  ...defineConfig({
    entry: "src/ColorPicker.svelte",
    ssrEntryFileName: "ColorPicker.ssr",
  }),
];
```

svebcomponents reads `vite.config.*` or `svelte.config.*` and passes
`preprocess`, `extensions`, and `compilerOptions` to the browser and SSR builds.
Its `customElement` and `generate: "server"` settings take precedence.

If the loaded Svelte config enables `compilerOptions.experimental.async`, the
generated browser and SSR outputs are async-compiled. Host apps that consume
those SSR renderers must use an async-capable host integration.

## Options

| Option             | Default                         | Description                                                                                                  |
| ------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `entry`            | `"src/ExampleComponent.svelte"` | Entry file for the Svelte custom element package.                                                            |
| `outDir`           | `"dist/client"`                 | Output directory for the standalone browser custom element build.                                            |
| `svelteOutDir`     | `undefined`                     | Output directory for the Svelte-aware browser build.                                                         |
| `ssr`              | `true`                          | Whether to generate the SSR build.                                                                           |
| `ssrOutDir`        | `"dist/server"`                 | Output directory for the standalone SSR build.                                                               |
| `ssrSvelteOutDir`  | `undefined`                     | Output directory for the Svelte-aware SSR build.                                                             |
| `ssrEntryFileName` | `"ssr"`                         | Basename of the generated renderer entry. Must be unique per component within one `ssrOutDir`.               |
| `hydratable`       | `true`                          | Whether the compiled element hydrates server-rendered shadow DOM instead of re-rendering it. Requires `ssr`. |
| `svelteConfig`     | loaded from the project         | Overrides the `preprocess`, `extensions` and `compilerOptions` picked up from `vite`/`svelte` config.        |
| `neverBundle`      | `[]`                            | Dependency patterns the browser output should leave external instead of inlining.                            |

## Build Pipeline

The browser build uses:

1. `@svebcomponents/auto-options`
2. `rollup-plugin-svelte` with `compilerOptions.customElement: true`
3. a guard that makes Svelte's generated `customElements.define(...)` call
   idempotent
4. declaration generation from the component analyzer

A Svelte-aware browser build uses the same pipeline and marks `svelte` and
`svelte/*` imports as external.

The SSR build uses:

1. `@svebcomponents/ssr`'s tsdown config helper
2. Svelte compiled with `generate: "server"`
3. a generated `ElementRenderer` entrypoint for server-side rendering

The build compiles an adjacent `entry.ssr.ts` or `entry.ssr.js` file as a server
entry and connects it to the generated renderer.

A Svelte-aware SSR build externalizes `svelte` and `svelte/*` imports and uses
the Svelte-aware client output.

## Default configuration

If the CLI finds no config file or component exports, it uses:

```ts
defineConfig({});
```

That builds `src/ExampleComponent.svelte` to `dist/client` and `dist/server`.
