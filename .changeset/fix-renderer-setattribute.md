---
"@svebcomponents/ssr": patch
---

Clean up `SvelteCustomElementRenderer.setAttribute` by removing the dead non-string branch (all callers honor the string contract; non-string values go through `setProperty`), and add a `removeAttribute` method that deletes the attribute from the internal SSR attribute map and notifies the client element via `attributeChangedCallback(name, oldValue, null)`, mirroring browser semantics.
