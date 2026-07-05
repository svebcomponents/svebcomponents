---
"@svebcomponents/build": patch
"@svebcomponents/utils": patch
"@svebcomponents/auto-options": patch
---

Fix publint compliance: put the `types` export condition first so TypeScript resolves declarations as published, add `files` fields so tarballs only ship `dist` (and `bin.js` for the build package), and run publint as part of every publishable package's build.
