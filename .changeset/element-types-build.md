---
"@svebcomponents/build": minor
---

Emit `custom-elements.json` (custom elements manifest 2.1.0) and
`custom-elements.d.ts` alongside the build, so editors and consuming templates
know which elements a package declares and what they accept.

The manifest describes attributes, property-only members, events with their
detail type, slots and CSS custom properties. The declaration file turns that
into an `HTMLElementTagNameMap` entry — typing `document.querySelector("my-el")`
— plus template augmentations for Svelte (`SvelteHTMLElements`), Vue
(`GlobalComponents`) and React (`JSX.IntrinsicElements`).

Property-only props (functions, snippets) appear on the DOM element interface
but deliberately not on the template surface: in a template `onPick={fn}` is
event-handler syntax rather than a property assignment, so listing it there
would type-check a handler that never runs. Dispatched custom events are
exposed instead, both as `onname` handler props and as a typed event map for
`addEventListener`.

React 19 or later is required for the React augmentation to describe real
behaviour; earlier versions stringify props passed to custom elements.
