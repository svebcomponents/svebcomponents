---
"@svebcomponents/ssr": patch
---

Fix the SSR Vite plugin corrupting self-closing custom elements (`<my-widget />`), which silently dropped the `_tagName` prop and broke SSR.
