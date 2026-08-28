---
"@svebcomponents/ssr": patch
"@svebcomponents/ssr-react": patch
---

Let bundlers drop the server renderer from client bundles

Neither package declared a `sideEffects` field, so a bundler had to assume
every module was impure and keep the whole graph — including `@lit-labs/ssr`
and parse5, which cannot run in a browser and were shipping to it.

`@svebcomponents/ssr` now lists the three modules that genuinely touch
`globalThis`, and `@svebcomponents/ssr-react` declares itself free of side
effects. In the repository's Next e2e app this cut the client chunks from
880 kB to 692 kB with no change to any output or API. Host adapters other than
React benefit from the same declaration.
