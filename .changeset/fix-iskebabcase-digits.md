---
"@svebcomponents/utils": patch
---

Allow digits in `isKebabCase` so attribute names like `col-2` or `heading2` are correctly detected as attributes, fixing SSR/client markup divergence.
