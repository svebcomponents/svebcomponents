---
"@svebcomponents/build": patch
---

Remove conflicting peerDependency on `@svebcomponents/ssr`, keeping only the regular workspace dependency since it is imported directly and unconditionally.
