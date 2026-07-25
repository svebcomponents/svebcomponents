---
"@svebcomponents/build": patch
---

Bundle the `hydratable` wrapper into a hydratable component's client build, so the Svelte-bundled `dist/client` stays loadable straight from a URL.

auto-options injects `import { hydratable } from "@svebcomponents/ssr/hydration"`, and only its sibling `@svebcomponents/ssr/hydration-host` was forced non-external. A component that declares `@svebcomponents/ssr` as the optional *peer* dependency it is meant to be therefore shipped a bare specifier in an otherwise self-contained bundle — which a browser cannot resolve without an import map, so the custom element never registered. Resolving it via an import map would not have been a fix either: the module imports `svelte`, so it would pull a second Svelte runtime in alongside the one already bundled.

Adds ~2 kB raw to `dist/client` for hydratable components, which is the cost of the bundle actually being self-contained.
