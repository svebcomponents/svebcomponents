---
"@svebcomponents/ssr": patch
---

Fix `installShim` unconditionally overwriting existing `Element`, `HTMLElement`, and `customElements` globals, which silently dropped custom elements already registered by another DOM shim or jsdom-based test setup.
