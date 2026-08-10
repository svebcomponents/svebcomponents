---
"@svebcomponents/utils": patch
---

Stop publishing the compiled test file.

`files` listed `dist` without the `!dist/**/*.test.*` exclusion the other
packages carry, so `dist/index.test.js` and its declarations shipped in the
tarball.
