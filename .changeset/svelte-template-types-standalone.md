---
"@svebcomponents/build": minor
---

Write the Svelte template types to their own file, so shipping them no longer
requires declaring `svelte`.

The `svelte/elements` augmentation can only be loaded where svelte exists — it
augments that module, and augmenting requires resolving it. That was handled by
emitting it into the entry's declarations only when the package declared
`svelte` as a required dependency of its consumers.

Which made "I want Svelte template types" mean "every one of my consumers must
install svelte", including the ones on a plain HTML page. For a toolchain whose
standalone build exists precisely to run without Svelte, that is the wrong
trade to force.

The augmentation is now always written, beside the entry's declarations:

```
dist/client/FavoriteNumber.svelte-types.d.ts
```

A package that requires svelte of its consumers has it referenced from those
declarations automatically, exactly as before — no setup for Svelte consumers.
Any other package exposes it and its Svelte consumers opt in with one line:

```json
{
  "exports": {
    "./svelte": { "types": "./dist/client/FavoriteNumber.svelte-types.d.ts" }
  }
}
```

```ts
// the consumer's app.d.ts — a .d.ts, so it never reaches runtime
import "my-components/svelte";
```

The build prints that wiring when it writes types nothing can reach.

## Migration

Nothing to do for packages that declare `svelte`. Packages that avoided
declaring it — and therefore had no template types — can now ship them by
adding the export above.
