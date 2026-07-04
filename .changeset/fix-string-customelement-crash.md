---
"@svebcomponents/auto-options": patch
---

Fix crash when using `<svelte:options customElement="tagName"/>` (the string variant); it now emits the unsupported-variant warning without throwing, and leaves svelte:options untouched.
