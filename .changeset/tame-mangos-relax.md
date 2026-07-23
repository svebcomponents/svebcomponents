---
"@svebcomponents/ssr": minor
---

`@svebcomponents/ssr/vite` now automatically adds `@svebcomponents/ssr` to Vite's `ssr.noExternal` — it ships raw `.svelte` files under some export conditions, which Node's SSR externalization can't load directly, so consumers previously had to configure this by hand. A new `noExternal` plugin option lets consumers add their own component package(s) alongside it. The package's `vite` peer range now also allows `^8.0.0` (not yet verified against a real Vite 8 install — no Vite 8 release is available to test against at time of writing).
