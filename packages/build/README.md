Build Svelte custom element packages with the `svebcomponents` CLI.

This package wraps `tsdown` with the defaults Svebcomponents needs:

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

Add a build script:

```json
{
  "scripts": {
    "build": "svebcomponents"
  }
}
```

## Zero-config Builds

For the common case, describe your component entrypoints in `package.json` exports and run `svebcomponents`.

```json
{
  "exports": {
    ".": {
      "types": "./dist/client/index.d.ts",
      "svelte": "./dist/client-svelte/index.js",
      "default": "./dist/client/index.js"
    },
    "./ssr": {
      "types": "./dist/server/ssr.d.ts",
      "svelte": "./dist/server-svelte/ssr.js",
      "default": "./dist/server/ssr.js"
    }
  }
}
```

The CLI looks for exports whose `default` or `import` condition points at `dist/client/*`, maps them back to matching files in `src/*`, and builds them.

For the example above, `./dist/client/index.js` maps to `src/index.ts` and produces:

- `dist/client/index.js` for the standalone browser custom element entrypoint.
- `dist/client/index.d.ts` for TypeScript consumers.
- `dist/client-svelte/index.js` for Svelte-aware tooling because the `svelte` condition exists.
- `dist/server/*` for the server-renderable build because the matching `./ssr` export exists.
- `dist/server-svelte/*` for Svelte-aware SSR tooling because the `./ssr` export also has a `svelte` condition.

If an export does not have a matching SSR export, only the browser build is generated for that entrypoint.

### Server preparation

An SSR-enabled entrypoint can prepare properties before rendering by adding an
adjacent `.ssr` module. For `src/index.ts`, create `src/index.ssr.ts` and export
an `SsrPrepare` function as the default export:

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

Each export that points into `dist/client` is treated as a component entrypoint.

```json
{
  "exports": {
    ".": {
      "types": "./dist/client/index.d.ts",
      "svelte": "./dist/client-svelte/index.js",
      "default": "./dist/client/index.js"
    },
    "./button": {
      "types": "./dist/client/button.d.ts",
      "svelte": "./dist/client-svelte/button.js",
      "default": "./dist/client/button.js"
    },
    "./button/ssr": {
      "types": "./dist/server/button-ssr.d.ts",
      "svelte": "./dist/server-svelte/button-ssr.js",
      "default": "./dist/server/button-ssr.js"
    }
  }
}
```

This builds `src/index.ts` as a browser-only entrypoint, and `src/button.ts` as both a browser and SSR entrypoint. Each `svelte` condition also gets a Svelte-aware build in the matching `*-svelte` output directory.

## Manual Configuration

Create `svebcomponents.config.ts` when package export inference is not enough.

```ts
import { defineConfig } from "@svebcomponents/build";

export default defineConfig({
  entry: "src/index.ts",
  outDir: "dist/client",
  svelteOutDir: "dist/client-svelte",
  ssr: true,
  ssrOutDir: "dist/server",
  ssrSvelteOutDir: "dist/server-svelte",
});
```

`defineConfig` returns an array of `tsdown` options. By default it creates two builds:

- a browser build from `src/index.ts` to `dist/client`
- an SSR build from `src/index.ts` to `dist/server`

Set `svelteOutDir` and `ssrSvelteOutDir` to also emit Svelte-aware builds that externalize Svelte runtime imports.

Set `ssr: false` to emit only the browser custom element build.

Svebcomponents loads the package's Svelte configuration from `vite.config.*` or
`svelte.config.*` and passes `preprocess`, `extensions`, and `compilerOptions`
to the generated browser and SSR builds. Svebcomponents-owned compiler options
such as `customElement` and `generate: "server"` still take precedence.

If the loaded Svelte config enables `compilerOptions.experimental.async`, the
generated browser and SSR outputs are async-compiled. Host apps that consume
those SSR renderers must use an async-capable host integration.

## Options

| Option            | Default          | Description                                                       |
| ----------------- | ---------------- | ----------------------------------------------------------------- |
| `entry`           | `"src/index.ts"` | Entry file for the Svelte custom element package.                 |
| `outDir`          | `"dist/client"`  | Output directory for the standalone browser custom element build. |
| `svelteOutDir`    | `undefined`      | Output directory for the Svelte-aware browser build.              |
| `ssr`             | `true`           | Whether to generate the SSR build.                                |
| `ssrOutDir`       | `"dist/server"`  | Output directory for the standalone SSR build.                    |
| `ssrSvelteOutDir` | `undefined`      | Output directory for the Svelte-aware SSR build.                  |

## Build Pipeline

The browser build uses:

1. `@svebcomponents/auto-options`
2. `rollup-plugin-svelte` with `compilerOptions.customElement: true`
3. a guard that makes Svelte's generated `customElements.define(...)` call
   idempotent, so evaluating the compiled component (or a bundle containing
   it) more than once never throws
4. `tsdown` declaration generation

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

That builds `src/index.ts` to `dist/client` and `dist/server`.
