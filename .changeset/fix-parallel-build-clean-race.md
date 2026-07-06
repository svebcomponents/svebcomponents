---
"@svebcomponents/build": patch
"@svebcomponents/ssr": patch
---

Fix a race that could corrupt build output when several components share an output directory (e.g. multiple components inferred from package.json `exports` writing to `dist/client`): component configs are built in parallel and tsdown's default per-build `clean` deleted sibling builds' output. The config factories now set `clean: false` and the `svebcomponents` CLI cleans each distinct output directory once before building.
