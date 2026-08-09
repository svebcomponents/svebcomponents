---
"@svebcomponents/build": patch
---

Build `.ts`/`.js` module entries for the browser rather than for Node.

An ordinary module export is written into `dist/client/`, beside the compiled
components, and is loaded by browsers. Its tsdown config did not set
`platform`, so it took tsdown's default of `"node"` and resolved the `node` key
of a dependency's `exports` map — shipping a dependency's Node build in a bundle
served to the browser. Module entries now resolve the same conditions the
component build does, including `production`, so `esm-env`-style dev branches
are eliminated instead of surviving as runtime checks.
