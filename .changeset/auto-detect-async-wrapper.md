---
"@svebcomponents/ssr": minor
---

Auto-detect the async SSR wrapper from the host app's svelte config.

`svebcomponents({ async: true })` duplicated a fact the build already knows: an app compiled with `compilerOptions.experimental.async` needs the async wrapper, and an app without it cannot compile the async wrapper. Keeping the two in sync manually was an easy way to produce wrapper-mismatch hydration bugs.

The vite plugin now reads `experimental.async` from vite-plugin-svelte's resolved options and picks the wrapper variant automatically. The explicit `async` option remains as an override.
