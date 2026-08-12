`@svebcomponents/build` turns Svelte components into publishable custom-element
packages. The `svebcomponents` command reads your package exports, compiles the
browser and server targets, and writes declarations plus a Custom Elements
Manifest.

## Installation

```bash
pnpm add -D @svebcomponents/build
```

```json
{
  "scripts": {
    "build": "svebcomponents"
  }
}
```

## Configure outputs with package exports

Point each browser export at `./dist/client/`. svebcomponents maps the output
basename back to one source file under `src/`.

```json
{
  "exports": {
    ".": {
      "types": "./dist/client/ExampleComponent.d.ts",
      "default": "./dist/client/ExampleComponent.js"
    },
    "./svelte": {
      "types": "./dist/client/ExampleComponent.svelte-types.d.ts"
    },
    "./ssr": {
      "types": "./dist/server/ssr.d.ts",
      "default": "./dist/server/ssr.js"
    }
  }
}
```

This export map uses `src/ExampleComponent.svelte`. Run:

```bash
pnpm build
```

| Export                        | Output                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| `default` under `dist/client` | Standalone browser bundle with its Svelte runtime           |
| Matching `./ssr` export       | Server renderer for the component                           |
| `types`                       | Element, event, attribute, prop, handler, and tag-map types |

svebcomponents also writes `custom-elements.json` and DOM type augmentations.
The `./svelte` subpath is a type export. Svelte apps import it for template
types. Browser consumers use the component's `default` entry; SSR integrations
use the matching `/ssr` entry.
See [Configure package outputs](https://svebcomponents.dev/publishing/).

### Entry mapping

svebcomponents reads each `default` or `import` target that begins with
`./dist/client/` and checks for one matching source:

| Export target             | Accepted source                                          |
| ------------------------- | -------------------------------------------------------- |
| `./dist/client/button.js` | `src/button.svelte`, `src/button.ts`, or `src/button.js` |

A `.svelte` source gets the custom-element pipeline. A `.ts` or `.js` source
gets a browser module build. Keep one matching source for each basename.

For an export named `./color-picker`, add `./color-picker/ssr` to request its
server build. An export named `.` pairs with `./ssr`.

### Browser dependencies

The standalone browser build includes bare package imports, regardless of
whether you list them in `dependencies` or `devDependencies`. Keep packages
that consumers must install in `dependencies`.

Use `neverBundle` when the host must supply a dependency:

```json
{
  "svebcomponents": {
    "neverBundle": ["@acme/design-system", "@acme/design-system/**"]
  }
}
```

The patterns match full import specifiers. They do not affect server output.

## Server preparation

Place an optional `.ssr.ts` module beside a component when the server must load
data before rendering. `src/ExampleComponent.ssr.ts` supplies the hook for
`src/ExampleComponent.svelte`. Export an `SsrPrepare` function as its default
export and call `setProperty()` with values the component needs. A
promise-returning hook needs an async host. See
[Async components and server data](https://svebcomponents.dev/server-rendering/async/).

## Manual configuration

Create `svebcomponents.config.ts` when your source and export paths do not
follow the mapping above.

```ts
import { defineConfig } from "@svebcomponents/build";

export default defineConfig({
  entry: "src/ExampleComponent.svelte",
  outDir: "dist/client",
  ssr: true,
  ssrOutDir: "dist/server",
});
```

`defineConfig()` returns tsdown configuration entries. Export a flat array for
several components:

```ts
export default [
  ...defineConfig({
    entry: "src/button.svelte",
    ssrEntryFileName: "button-ssr",
  }),
  ...defineConfig({
    entry: "src/dialog.svelte",
    ssrEntryFileName: "dialog-ssr",
  }),
];
```

| Option             | Default                       | Purpose                                                |
| ------------------ | ----------------------------- | ------------------------------------------------------ |
| `entry`            | `src/ExampleComponent.svelte` | Svelte component source                                |
| `outDir`           | `dist/client`                 | Standalone browser output                              |
| `ssr`              | `true`                        | Generate a server renderer                             |
| `ssrOutDir`        | `dist/server`                 | Standalone server output                               |
| `ssrEntryFileName` | `ssr`                         | Generated renderer basename                            |
| `hydratable`       | `true` when `ssr` is on       | Hydrate the server-rendered shadow root                |
| `neverBundle`      | `[]`                          | Browser dependencies left external                     |
| `svelteConfig`     | none                          | Svelte preprocessors, extensions, and compiler options |

Export-inferred builds load `vite.config.*` or `svelte.config.*`. Manual configs
must pass the fields they need through `svelteConfig`. svebcomponents applies
its browser or server compiler target after those fields. Read
[Configuration](https://svebcomponents.dev/guides/manual-configuration/) for
precedence and multi-entry examples.

See [Build pipeline](https://svebcomponents.dev/guides/build/) for the target
matrix, generated file tree, and compiler steps.

## Limits

- Export inference accepts paths under `./dist/client/`.
- Each inferred basename must match one `.svelte`, `.ts`, or `.js` source.
- A package with colliding renderer names must set `ssrEntryFileName` for each
  component.
