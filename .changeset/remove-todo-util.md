---
"@svebcomponents/utils": patch
---

Remove the unused `TODO()` helper export and its README documentation. Nothing in the repo (or any published svebcomponents package) called it — it was dead code that only logged to the console. Strictly speaking, dropping an export is a breaking change, but the package is 0.x and the helper was documented as internal/experimental, so this ships as a patch.
