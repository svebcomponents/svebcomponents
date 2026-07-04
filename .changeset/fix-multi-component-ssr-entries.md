---
"@svebcomponents/build": patch
"@svebcomponents/ssr": patch
---

Generate the SSR renderer entry filename from the declared package export instead of hardcoding `ssr.js`.

Previously every SSR build wrote `<ssrOutDir>/ssr.js` regardless of the declared export. This meant the multi-component setup documented in the build README (e.g. `"./button/ssr": "./dist/server/button-ssr.js"`) produced a dangling export, and two SSR components sharing an output directory overwrote each other's generated entry.

`inferComponents` now derives the entry basename from the declared ssr export path, and a new `ssrEntryFileName` option on `defineConfig` (defaulting to `"ssr"`) threads it through `svebcomponentsSsr` into `pluginGenerateSsrEntry`. Single-component behavior is unchanged.
