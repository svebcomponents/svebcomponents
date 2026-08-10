---
"@svebcomponents/build": patch
"@svebcomponents/ssr": patch
"@svebcomponents/ssr-vue": patch
"@svebcomponents/ssr-react": patch
"@svebcomponents/ssr-astro": patch
"@svebcomponents/utils": patch
---

Documentation pass across the package READMEs ahead of the beta launch.

- `@svebcomponents/ssr`, `ssr-vue`, `ssr-react` and `ssr-astro` gained the
  install command they were missing.
- `@svebcomponents/build`'s options table was missing `hydratable`,
  `ssrEntryFileName` and `svelteConfig`, and did not show how a package with
  several components composes `defineConfig` calls.
- `@svebcomponents/ssr`'s package-author example used `import` without `types`
  where every other example in the docs uses `default` with them, and the
  `enable-async` opt-in for non-Svelte hosts was undocumented.
- The three integration READMEs each restated the shared SSR layer's
  behaviour — the Lit renderer registry, the server-side `svelte` requirement,
  the declarative shadow DOM contract, the definition of an asynchronous
  component. Each now links to the canonical explanation and keeps only what
  is specific to its framework.
- Removed references to internal `e2e/*` directories, which readers cannot
  run, and normalised the product name to lowercase `svebcomponents`.
