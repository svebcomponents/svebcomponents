---
"@svebcomponents/auto-options": minor
"@svebcomponents/build": minor
"@svebcomponents/ssr": patch
---

Components can now declare their custom element tag with Svelte's own string-shorthand syntax, and never need a manual registration call:

```svelte
<svelte:options customElement="my-component" />
```

`@svebcomponents/auto-options` expands this into the object form, merging in the inferred `props` (previously this form was rejected outright — `<svelte:options customElement="tag-name"/>` bailed with a warning and skipped prop inference entirely). The object form (`customElement={{ tag: "..." }}`) is unaffected.

`@svebcomponents/build`'s browser build now guards Svelte's own auto-generated `customElements.define(...)` call against being run more than once — the actual reason component entrypoints previously had to hand-write a guarded registration via `@svebcomponents/utils`'s `defineElement`. That's no longer necessary: a package entrypoint can simply re-export its component, with no registration call at all. `defineElement` remains available as a manual escape hatch for tags that can't be a literal in `<svelte:options>` (e.g. computed at build time).

`@svebcomponents/ssr`'s generated SSR entry now reads a component's tag from its `<svelte:options customElement>` declaration (via `svelte/compiler`'s normalized `parse()` output, which resolves both syntax forms identically) instead of regexing a `defineElement(...)` call out of the entry file — no behavior change for consumers, just a more direct source now that the tag no longer needs to live in a separate manual call.
