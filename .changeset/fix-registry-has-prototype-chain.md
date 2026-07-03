---
"@svebcomponents/ssr": patch
---

Fix `ElementRendererRegistry.has()` to correctly walk the element prototype chain, matching the behavior of `get()`.
