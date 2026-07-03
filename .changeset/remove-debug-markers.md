---
"@svebcomponents/ssr": patch
---

Remove leftover debug markers (`<p>server</p>` / `<p>client</p>`) from the SSR wrapper components that were leaking into consumer apps' SSR output and breaking hydration matching.
