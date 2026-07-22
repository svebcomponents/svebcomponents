---
"@svebcomponents/build": patch
---

Fix the CLI entry point on Windows by converting its absolute path to a file URL before importing it. Align `tsdown` with consumer installations through a peer dependency and make the `defineConfig` return type explicit so exported configs have portable declaration types.
