---
"@svebcomponents/ssr": minor
---

Resolve a component's custom element tag from a direct `.svelte` entry, and
stop asking tsdown for declarations it cannot produce.

`svebcomponentsSsr` reads the declared tag so the generated SSR renderer can
self-register with `ElementRendererRegistry` instead of making the consuming app
do it by hand. It previously found that tag by reading the entry as a script
module and following its first relative `.svelte` import — the shape a
svebcomponent entry had when it was a `.ts` file that re-exported a component.
Entries are now the component itself, so the tag is read from the entry
directly.

Declaration generation is also disabled for `.svelte` entries. tsdown cannot
emit declarations for a raw Svelte entry; `@svebcomponents/build` writes the
component's public declaration from analyzer metadata instead.

## Breaking

Calling `svebcomponentsSsr` directly with a `.ts`/`.js` entry no longer
resolves a tag, so the generated renderer will not self-register. This is a
silent change in behaviour — SSR stops producing markup for the element rather
than failing the build — because tag resolution is deliberately best-effort and
falls open.

Point the entry at the `.svelte` component:

```diff
-svebcomponentsSsr({ entry: "src/index.ts", outDir: "dist/server" });
+svebcomponentsSsr({ entry: "src/index.svelte", outDir: "dist/server" });
```

If the entry has to stay a script module, register the renderer yourself:

```ts
import { ElementRendererRegistry } from "@svebcomponents/ssr";

ElementRendererRegistry.set("my-element", MyElementRenderer);
```

The internal `findSvelteImportPath` helper is gone. It was never reachable
through the package's `exports`, so this affects no supported import path.
