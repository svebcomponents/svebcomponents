---
"@svebcomponents/auto-options": patch
---

Fix inferred props declared only via `<svelte:options customElement={{props: {...}}}>` (without an `attribute` field and without a matching `$props()` destructure) emitting `attribute: "undefined"` instead of falling back to the kebab-cased prop name.
