---
"@svebcomponents/build": minor
"@svebcomponents/ssr": minor
---

Remove the runtime-sharing browser and server targets selected by `svelte`
export conditions and the `svelteOutDir` and `ssrSvelteOutDir` configuration
options. Each generated component now uses one standalone browser target and
one server target.

Remove the `externalSvelte` option from the `@svebcomponents/ssr/tsdown`
configuration helpers. The helpers now produce the single server build used by
`@svebcomponents/build`.

Remove runtime `svelte` conditions from component package exports. The
type-only `./svelte` subpath for `*.svelte-types.d.ts` remains supported, as do
the raw `.svelte` conditions published by `@svebcomponents/ssr`.
