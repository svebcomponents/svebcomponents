Build Svelte custom element packages with the `svebcomponents` CLI.

This package wraps `tsdown` with the defaults Svebcomponents needs:

- Svelte files are compiled as custom elements for the browser build.
- `@svebcomponents/auto-options` runs before Svelte, so component props can be inferred into `<svelte:options customElement={...} />`.
- Type declarations are emitted alongside the JavaScript output.
- An SSR build can be generated with `@svebcomponents/ssr/tsdown`.

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
      "import": "./dist/client/index.js"
    },
    "./ssr": {
      "import": "./dist/server/ssr.js"
    }
  }
}
```

The CLI looks for exports that point at `dist/client/*`, maps them back to matching files in `src/*`, and builds them.

For the example above, `./dist/client/index.js` maps to `src/index.ts` and produces:

- `dist/client/index.js` for the browser custom element entrypoint.
- `dist/client/index.d.ts` for TypeScript consumers.
- `dist/server/*` for the server-renderable build because the matching `./ssr` export exists.

If an export does not have a matching SSR export, only the browser build is generated for that entrypoint.

## Multiple Components

Each export that points into `dist/client` is treated as a component entrypoint.

```json
{
  "exports": {
    ".": {
      "import": "./dist/client/index.js"
    },
    "./button": {
      "import": "./dist/client/button.js"
    },
    "./button/ssr": {
      "import": "./dist/server/button-ssr.js"
    }
  }
}
```

This builds `src/index.ts` as a browser-only entrypoint, and `src/button.ts` as both a browser and SSR entrypoint.

## Manual Configuration

Create `svebcomponents.config.ts` when package export inference is not enough.

```ts
import { defineConfig } from "@svebcomponents/build";

export default defineConfig({
  entry: "src/index.ts",
  outDir: "dist/client",
  ssr: true,
  ssrOutDir: "dist/server",
});
```

`defineConfig` returns an array of `tsdown` options. By default it creates two builds:

- a browser build from `src/index.ts` to `dist/client`
- an SSR build from `src/index.ts` to `dist/server`

Set `ssr: false` to emit only the browser custom element build.

## Options

| Option      | Default          | Description                                            |
| ----------- | ---------------- | ------------------------------------------------------ |
| `entry`     | `"src/index.ts"` | Entry file for the Svelte custom element package.      |
| `outDir`    | `"dist/client"`  | Output directory for the browser custom element build. |
| `ssr`       | `true`           | Whether to generate the SSR build.                     |
| `ssrOutDir` | `"dist/server"`  | Output directory for the SSR build.                    |

## Build Pipeline

The browser build uses:

1. `@svebcomponents/auto-options`
2. `rollup-plugin-svelte` with `compilerOptions.customElement: true`
3. `tsdown` declaration generation

The SSR build uses:

1. `@svebcomponents/ssr`'s tsdown config helper
2. Svelte compiled with `generate: "server"`
3. a generated `ElementRenderer` entrypoint for server-side rendering

## When Configuration Is Missing

If the CLI cannot load `svebcomponents.config.ts` or infer any component exports from `package.json`, it falls back to:

```ts
defineConfig({});
```

That builds `src/index.ts` to `dist/client` and `dist/server`.
