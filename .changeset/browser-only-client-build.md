---
"@svebcomponents/ssr-react": patch
---

Keep the server-rendering stack out of client bundles

The wrapper imports the element renderer to server-render, and no bundler can
drop that import: `@svebcomponents/ssr` installs its DOM shim as an import side
effect, so the module stays reachable even though the browser branch never
calls into it. `@lit-labs/ssr` and parse5 shipped to the browser as a result.

The package's entry points now carry a `browser` export condition selecting a
build that omits the renderer entirely. In the repo's Next e2e app this cut the
client chunks from 880 kB to 668 kB. Nothing about the rendered output changes.
