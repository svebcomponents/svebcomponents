---
"@svebcomponents/build": patch
"@svebcomponents/ssr": patch
---

Point the CLI and runtime messages at the documentation's new URLs.

The docs site moved its concept pages to paths that match how the sidebar is
organised, so the two links printed from package code moved with them:

- the manifest hint in `@svebcomponents/build` now points at
  `/guides/build/#element-types--manifest`
- the slotted-component hydration notice in `@svebcomponents/ssr` now points at
  `/server-rendering/hydration/#limitations`

The old paths are redirected, so messages printed by already-released versions
keep resolving.
