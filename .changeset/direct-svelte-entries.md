---
"@svebcomponents/build": minor
---

Infer custom elements directly from same-basename `.svelte` source files and
build same-basename `.ts`/`.js` sources as ordinary modules. Component packages
no longer need TypeScript files whose only job is to re-export a Svelte
component, and mixed packages can ship helpers without running them through the
custom-element pipeline.

## Migration

Remove re-export-only entry modules and rename each component to match its
declared JavaScript output. Given this export:

```json
{
  "exports": {
    ".": {
      "types": "./dist/client/index.d.ts",
      "default": "./dist/client/index.js"
    }
  }
}
```

replace `src/index.ts` plus `src/Component.svelte` with
`src/index.svelte`. Alternatively, change all three output basenames to
`Component` and keep `src/Component.svelte`.

The source convention is strict:

- `<name>.svelte` is a svebcomponent entry.
- `<name>.ts` or `<name>.js` is an ordinary module entry.
- More than one matching source is an error; use an explicit
  `svebcomponents.config.ts` for non-conventional layouts.

For SSR preparation, place `<name>.ssr.ts` or `<name>.ssr.js` next to
`<name>.svelte`. Component-style `<export>/ssr` subpaths are accepted only for
component entries; expose ordinary server modules under independent keys.

Direct component declarations are now generated from component analysis and
include the module's default custom-element constructor together with the
element, attribute, event, and template types.
