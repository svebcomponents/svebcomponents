---
"@svebcomponents/build": minor
---

Emit a custom elements manifest and TypeScript types for the elements a package
ships, so editors and consuming templates know the tags and what they accept.

`custom-elements.json` (custom elements manifest 2.1.0) describes attributes,
property-only members, events with their detail type, slots and CSS custom
properties. The build points out the `package.json` wiring it needs
(`customElements`, `files`) when that is missing.

The TypeScript half is appended to the declaration file each entry already
emits — the one its `types` condition points at — so `import "my-components"`
is enough to type `document.querySelector("my-el")`. Per element it exports:

- `XElement` — the DOM element, with a narrowed `addEventListener`
- `XAttributes` — what markup may set, each attribute also accepting its
  string form
- `XEventHandlers` — `onname`-style handler props for dispatched events
- `XEventMap` — event name to `CustomEvent<Detail>`

Svelte template types are registered automatically when the package declares
`svelte` as a required dependency of its consumers (a `dependency`, or a
`peerDependency` not marked optional). That gate matters: the augmentation
imports from `svelte/elements`, and a package whose standalone build bundles
Svelte may be consumed by an application with no `svelte` installed, which
would then fail to resolve it under `skipLibCheck: false`.

Vue and React augmentations are **not** generated. They have to name types
from frameworks this package neither depends on nor tests against, and those
conventions change between major versions, so a subtly wrong generated
augmentation would be worse than a few lines the consumer controls. The docs'
Types section carries verified recipes built from the exported types.

Property-only props (functions, snippets) appear on the element interface but
never among the attributes: in a template `onPick={fn}` is event-handler syntax
rather than a property assignment, so listing it there would type-check a
handler that never runs. Dispatched custom events are exposed instead.
