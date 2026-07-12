---
"@svebcomponents/utils": minor
---

Add `defineElement(tagName, component)` — a safe registration helper for component entry points.

Every component package previously hand-wrote the same guarded `customElements.define` boilerplate, with subtle variations (some checked `"element" in Component`, some `Component.element` truthiness, some forgot the already-registered guard). `defineElement` owns the arcana:

- no-ops when the component has no custom element constructor (the server compile)
- no-ops when there is no `customElements` registry at all
- no-ops when the tag is already registered — svelte auto-defines when `<svelte:options customElement={{ tag }}>` declares a tag, and a page can load two bundles containing the same component; first registration wins instead of throwing

Entry points shrink to:

```ts
import { defineElement } from "@svebcomponents/utils";
import MyComponent from "./MyComponent.svelte";

export default MyComponent;
defineElement("my-component", MyComponent);
```
