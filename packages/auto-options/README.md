`@svebcomponents/auto-options` infers Svelte custom-element prop metadata from
`$props()` declarations. It supplies attribute names, converters, and
reflection settings before Svelte compiles the component.

`@svebcomponents/build` includes this plugin. Install it on its own when you
manage the Vite and Svelte builds yourself.

## Installation

```bash
pnpm add -D @svebcomponents/auto-options
```

Put it before the Svelte plugin:

```ts
import autoOptions from "@svebcomponents/auto-options";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    autoOptions(),
    svelte({ compilerOptions: { customElement: true } }),
  ],
});
```

Register the class that Svelte generates. The
[`@svebcomponents/build` guide](https://svebcomponents.dev/guides/build/)
covers registration and package output.

## Inferred metadata

Declare a tag and type your props:

```svelte
<svelte:options customElement="favorite-number" />

<script lang="ts">
  interface Props {
    favoriteNumber: number;
    settings: Record<string, string>;
  }

  let props: Props = $props();
</script>
```

The plugin gives Svelte this custom-element configuration:

```svelte
<svelte:options
  customElement={{
    tag: "favorite-number",
    props: {
      favoriteNumber: {
        attribute: "favorite-number",
        reflect: true,
        type: "Number",
      },
      settings: {
        attribute: "settings",
        reflect: false,
        type: "Object",
      },
    },
  }}
/>
```

Svelte uses these fields when it converts attributes and reflects property
changes.

| Prop declaration                                    | Svelte converter                 | Reflects by default |
| --------------------------------------------------- | -------------------------------- | ------------------- |
| `string`, `number`, `boolean`, or matching literals | `String`, `Number`, or `Boolean` | yes                 |
| `T[]` or `Array<T>`                                 | `Array`                          | no                  |
| object literal, `Record`, or local interface        | `Object`                         | no                  |
| untyped destructured prop                           | `String`                         | yes                 |
| imported or unresolved type                         | `String` fallback                | no                  |
| function or `Snippet`                               | no attribute metadata            | no                  |

The plugin converts inferred attribute names to kebab case, including
`favoriteNumber` to `favorite-number`.

It reads inline object types, local type aliases, local interfaces, and
destructured `$props()`. It treats `null` and `undefined` union members as
optional variants of the remaining type.

## Override an inferred field

Write the field in `<svelte:options>`. Your value takes precedence. The plugin
fills missing fields and props.

```svelte
<svelte:options
  customElement={{
    tag: "counter-display",
    props: {
      count: { attribute: "value", reflect: false, type: "Number" },
    },
  }}
/>
```

Use the object form when you also set Svelte options such as `shadow` or
`extend`.

Hydration requires Svelte's default open shadow root. Do not combine
`hydratable: true` with `shadow: "none"`.

## Plugin API

```ts
autoOptions({ hydratable?: boolean })
```

`hydratable: true` injects the client extension from
`@svebcomponents/ssr/hydration`. `@svebcomponents/build` sets this option for
hydrating SSR builds.

The `@svebcomponents/auto-options/analyze` export provides
`analyzeComponent(code, id)` and its metadata types. The build package uses it
to generate declarations and `custom-elements.json` from the same source data.

## Limits

- The analyzer supports Svelte 5 `$props()` declarations.
- Tags must use a string literal or an object with a literal `tag` value.
- Imported and complex TypeScript types fall back to `String` conversion.
- Manual `<svelte:options>` metadata takes precedence when inference cannot
  express the component API.

Read [Attribute metadata](https://svebcomponents.dev/guides/attribute-inference/)
for authoring examples and reflection guidance.
