Build Svelte custom element packages with the `svebcomponents` command.

This package wraps `tsdown` with the defaults svebcomponents needs:

- Svelte files are compiled as custom elements for the browser build.
- `@svebcomponents/auto-options` runs before Svelte, so component props can be inferred into `<svelte:options customElement={...} />`.
- The browser build guards Svelte's generated custom element registration against being run more than once.
- Type declarations are emitted alongside the JavaScript output.
- An SSR build can be generated with `@svebcomponents/ssr/tsdown`.
- Svelte conditional exports can be generated for Svelte-aware tooling.

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

For the common case, describe your component entrypoints in `package.json`
exports:

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

If a component export does not have a matching SSR export, only the browser
build is generated. Ordinary modules are built independently and do not
receive component SSR output.

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

The build discovers this file automatically and includes it only in the server
output. Properties set by the hook participate in rich-property serialization,
so hydratable components receive the prepared value without repeating the work
in the browser. Return synchronously when no preparation is needed to preserve
the synchronous SSR path; a returned promise requires an async-capable host.

## What Ends Up In The Browser Bundle

`dist/client` is a final-form browser artifact: it is loaded from a URL, or from
a bundle that has already resolved everything. There is no module resolver at
that point, so the browser builds **inline every bare specifier**, regardless of
whether `package.json` calls it a `dependency` or a `devDependency`.

That classification answers a different question — what a consumer must install
— and inferring bundling from it produced files no browser could load, silently.
A specifier that is inlined but cannot be resolved now fails the build instead.

Left external: Node builtins (a browser bundle importing `node:fs` is broken
either way), relative and absolute paths, and protocol imports.

You are therefore free to declare dependencies for what they actually mean. If
your published element types name a type from another package, declare it and
the browser bundle still carries the code:

```json
{
  "dependencies": { "my-data-package": "^1.0.0" }
}
```

The same goes for `svelte`: declaring it never costs you the runtime the
standalone build exists to carry.

### Opting out

For the rare dependency the host should provide — another custom element package
you must not duplicate, say — list it:

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

Every build writes the `svelte/elements` augmentation that teaches Svelte
templates about your elements — unknown attributes and `increments={"nope"}`
become errors — to a file beside the entry's declarations:

```
dist/client/ExampleComponent.svelte-types.d.ts
```

It lives in its own file because loading it requires svelte: it augments
`svelte/elements`, and a consumer without svelte installed cannot resolve that.

**If your package requires svelte of its consumers** (a `dependency`, or a
`peerDependency` not marked optional) the entry's declarations reference it, and
your Svelte consumers need no setup.

**Otherwise** — including every package meant to work in non-Svelte
applications — expose it so Svelte consumers can opt in. The build prints the
wiring if you have not:

```json
{
  "exports": {
    "./svelte": { "types": "./dist/client/ExampleComponent.svelte-types.d.ts" }
  }
}
```

They then add one line, in a `.d.ts` so it never reaches runtime:

```ts
// app.d.ts
import "my-components/svelte";
```

Wanting Svelte template types therefore never obliges you to declare svelte, and
never obliges your consumers to install it.

React and Vue consumers write their own augmentation from the exported types —
see [typing elements in React & Vue](https://svebcomponents.dev/guides/framework-types/).

## Svelte Conditional Exports

The `svelte` condition provides a lighter build for consumers that already use
Svelte. It leaves `svelte` and `svelte/*` imports external, allowing
Svelte-aware tooling such as SvelteKit and `@sveltejs/vite-plugin-svelte` to
reuse the host application's runtime.

Other consumers fall back to `default`, which includes the Svelte runtime and
can run outside Svelte applications.

This optimization comes with a compatibility risk: the Svelte runtime internals
are versioned with Svelte and its compiler, but they are not a semver-stable
public API. A patch or minor compiler release can change the runtime contract in
ways that break previously compiled output. The component package and host
application should be built with the same Svelte version when using the `svelte`
export. Consumers that cannot guarantee that should use the standalone
`default` build.

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

`defineConfig` returns an array of `tsdown` options. By default it creates two builds:

- a browser build from `src/ExampleComponent.svelte` to `dist/client`
- an SSR build from `src/ExampleComponent.svelte` to `dist/server`

Set `svelteOutDir` and `ssrSvelteOutDir` to also emit Svelte-aware builds that externalize Svelte runtime imports.

Set `ssr: false` to emit only the browser custom element build.

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

svebcomponents loads the package's Svelte configuration from `vite.config.*` or
`svelte.config.*` and passes `preprocess`, `extensions`, and `compilerOptions`
to the generated browser and SSR builds. svebcomponents-owned compiler options
such as `customElement` and `generate: "server"` still take precedence.

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
   idempotent, so evaluating the compiled component (or a bundle containing
   it) more than once never throws
4. declaration generation from the component analyzer

When a Svelte-aware browser build is generated, it uses the same pipeline but
marks `svelte` and `svelte/*` imports as external.

The SSR build uses:

1. `@svebcomponents/ssr`'s tsdown config helper
2. Svelte compiled with `generate: "server"`
3. a generated `ElementRenderer` entrypoint for server-side rendering

If an adjacent `entry.ssr.ts` or `entry.ssr.js` file exists, it is compiled as
an additional server-only entry and wired into the generated renderer.

When a Svelte-aware SSR build is generated, it also externalizes `svelte` and
`svelte/*` imports and generates its renderer against the Svelte-aware client
output.

## When Configuration Is Missing

If the CLI cannot load `svebcomponents.config.ts` or infer any component exports from `package.json`, it falls back to:

```ts
defineConfig({});
```

That builds `src/ExampleComponent.svelte` to `dist/client` and `dist/server`.
