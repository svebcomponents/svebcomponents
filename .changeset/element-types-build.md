---
"@svebcomponents/build": minor
---

Emit a custom elements manifest and TypeScript declarations for the elements a
package ships, so editors and consuming templates know the tags and what they
accept.

`custom-elements.json` (custom elements manifest 2.1.0) describes attributes,
property-only members, events with their detail type, slots and CSS custom
properties.

The element interfaces and `HTMLElementTagNameMap` entries are appended to the
declaration file each entry already emits — the one its `types` condition
points at — so `import "my-components"` is enough to type
`document.querySelector("my-el")`. The framework template augmentations ship as
separate opt-in files (`custom-elements-svelte.d.ts`, `-vue`, `-react`) because
each imports from its framework, and a Svelte-only consumer must not be made to
resolve `vue`.

Each template entry composes the framework's own base attribute type — Svelte's
`HTMLAttributes`, React's `DetailedHTMLProps`, and for Vue a component-like type
exposing `$props`/`$emit`, which is what its template checker reads — so
`class`, `id` and DOM event handlers keep working alongside the element's own
attributes.

Property-only props (functions, snippets) appear on the DOM element interface
but deliberately not on the template surface: in a template `onPick={fn}` is
event-handler syntax rather than a property assignment, so listing it there
would type-check a handler that never runs. Dispatched custom events are
exposed instead, both as `onname` handler props and as a typed event map for
`addEventListener`.

React 19 or later is required for the React augmentation to describe real
behaviour; earlier versions stringify props passed to custom elements.
