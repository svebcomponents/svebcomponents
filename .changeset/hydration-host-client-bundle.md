---
"@svebcomponents/build": patch
---

The client build of a hydratable component now bundles `@svebcomponents/ssr`'s `HydrationHost` (compiled by the component's own toolchain, exactly like the server-side host) instead of leaving `import ... from "@svebcomponents/ssr/hydration-host"` as an external runtime import. That subpath ships as raw `.svelte`, so an external import resolved to an uncompiled `.svelte` at runtime — which a consuming app's SSR could only load by adding every such component to `ssr.noExternal`. With the host bundled, consuming apps no longer need a per-component `ssr.noExternal` entry. Hydration markers still match by construction because both the client and server host are compiled by the same (component author's) build.
