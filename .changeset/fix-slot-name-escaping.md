---
"@svebcomponents/ssr": patch
---

Escape slot names via JSON.stringify in the vite plugin's slot attribute transform, preventing syntax errors from slot names containing quotes.
