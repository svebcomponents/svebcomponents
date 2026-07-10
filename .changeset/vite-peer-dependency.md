---
"@svebcomponents/ssr": patch
"@svebcomponents/build": patch
---

Declare `vite`, `tsdown`, and `rolldown` as optional peer dependencies of `@svebcomponents/ssr`.

The `./vite` and `./tsdown` entries type against these packages, but they were only devDependencies — under pnpm's isolated layout a consumer's TypeScript resolves the emitted declarations against a *different* installation than the consumer's own, so the plugin's `Plugin` type never unifies with the consumer's `PluginOption` and every consumer needs an `as unknown as PluginOption` cast. Declaring them as optional peers makes the package resolve the consumer's copies, so the types unify. Optional because the runtime entries (`.`, `/shim`, `/hydration`) need none of them.

`@svebcomponents/build`: `createTsdownConfig` now has an explicit `Options` return type — the inferred type referenced rollup's plugin types through non-portable `.pnpm` paths (TS2742) in the emitted declarations.
