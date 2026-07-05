---
"@svebcomponents/build": patch
"@svebcomponents/ssr": patch
"@svebcomponents/auto-options": patch
"@svebcomponents/utils": patch
---

Declare supported Node versions (`engines.node: ">=20.19.0"`) so consumers get a clear error instead of an opaque runtime failure on unsupported Node versions.
