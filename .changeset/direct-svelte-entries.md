---
"@svebcomponents/build": minor
---

Infer custom elements directly from same-basename `.svelte` source files and
build same-basename `.ts`/`.js` sources as ordinary modules. Mixed packages can
ship helpers without running them through the custom-element pipeline.

## Migration

Rename each component to match its declared JavaScript output. Given this
export:

```json
{
  "exports": {
    ".": {
      "types": "./dist/client/ExampleComponent.d.ts",
      "default": "./dist/client/ExampleComponent.js"
    }
  }
}
```

use `src/ExampleComponent.svelte` as the source entry.

When upgrading, delete any entry module that only exported the component. If
the module also contains runtime logic or additional exports, keep it as an
ordinary module or move to an explicit `svebcomponents.config.ts`.

The source convention is strict:

- `<name>.svelte` is a svebcomponent entry.
- `<name>.ts` or `<name>.js` is an ordinary module entry.
- More than one matching source is an error; use an explicit
  `svebcomponents.config.ts` for non-conventional layouts.

For SSR preparation, place `<name>.ssr.ts` or `<name>.ssr.js` next to
`<name>.svelte`.

Direct component declarations are now generated from component analysis and
include the module's default custom-element constructor together with the
element, attribute, event, and template types.
