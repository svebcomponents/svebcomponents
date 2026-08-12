Generate Svelte's custom-element prop options from `$props()` types.

Svelte uses the `customElement.props` option to convert attributes and reflect
properties. TypeScript props contain the information that option needs.

`@svebcomponents/auto-options` reads a component's instance script and writes
the inferred metadata into Svelte's `<svelte:options customElement={...} />`.

## Example

```svelte
<script lang="ts">
  interface Props {
    favoriteNumber: number;
  }

  let props: Props = $props();
</script>

<h1>Favorite number: {props.favoriteNumber}</h1>
```

The plugin transforms it before the Svelte compiler runs:

```svelte
<svelte:options
  customElement={{
    props: {
      favoriteNumber: {
        attribute: "favorite-number",
        reflect: true,
        type: "Number",
      },
    },
  }}
/>

<script lang="ts">
  interface Props {
    favoriteNumber: number;
  }

  let props: Props = $props();
</script>

<h1>Favorite number: {props.favoriteNumber}</h1>
```

The generated attribute name is kebab-cased, so consumers can use:

```html
<favorite-number favorite-number="42"></favorite-number>
```

## Usage

### With `@svebcomponents/build`

`@svebcomponents/build` runs `@svebcomponents/auto-options` before Svelte.

### Manual Usage

Install the package:

```bash
pnpm add -D @svebcomponents/auto-options
```

Add the plugin before the Svelte plugin in your Vite config:

```ts
import autoOptions from "@svebcomponents/auto-options";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    autoOptions(),
    svelte({
      compilerOptions: {
        customElement: true,
      },
    }),
  ],
});
```

Expose the compiled custom element from your package entrypoint. Without
`@svebcomponents/build`, guard the registration yourself:

```ts
import Component from "./Component.svelte";

if (!customElements.get("favorite-number") && Component.element) {
  customElements.define("favorite-number", Component.element);
}

export default Component;
```

`auto-options` generates prop metadata for attribute conversion. You must also
compile and register the component as a custom element. Otherwise,
`favorite-number="42"` remains a string.

Declare the tag with Svelte's string shorthand. `auto-options` expands it and
adds the inferred `props`:

```svelte
<svelte:options customElement="favorite-number" />
```

Use the object form when you need `shadow` or a custom `extend`:

```svelte
<svelte:options
  customElement={{
    tag: "favorite-number",
  }}
/>
```

## Inferred types

The plugin looks for a variable declaration initialized from `$props()` in the component instance script.

```svelte
<script lang="ts">
  let props: Props = $props();
</script>
```

It can infer prop names and custom element types from:

| Svelte prop type           | Generated custom element type          |
| -------------------------- | -------------------------------------- |
| `string`                   | `"String"`                             |
| `number`                   | `"Number"`                             |
| `boolean`                  | `"Boolean"`                            |
| string/number/bool literal | `"String"`, `"Number"`, or `"Boolean"` |
| `SomeType[]`               | `"Array"`                              |
| `Array<SomeType>`          | `"Array"`                              |
| object type literals       | `"Object"`                             |
| `Record<...>`              | `"Object"`                             |
| interface references       | `"Object"`                             |

Props without TypeScript types use `"String"`, the default HTML attribute type.

## Supported Prop Shapes

Inline prop types:

```svelte
<script lang="ts">
  let props: { count: number } = $props();
</script>
```

Type aliases:

```svelte
<script lang="ts">
  type Props = {
    count: number;
  };

  let props: Props = $props();
</script>
```

Interfaces:

```svelte
<script lang="ts">
  interface Props {
    count: number;
  }

  let props: Props = $props();
</script>
```

Destructured props:

```svelte
<script lang="ts">
  let { count, ...rest }: { count: number } = $props();
</script>
```

Untyped destructured props:

```svelte
<script>
  let { label } = $props();
</script>
```

## Existing Options

Manual custom element options take precedence.

```svelte
<svelte:options
  customElement={{
    props: {
      count: { type: "String", attribute: "data-count" },
    },
  }}
/>
```

If the plugin infers `count` as a number, it preserves your `type` and
`attribute` values and fills in missing fields.

Define one prop or the full `props` object when inference cannot describe the
component. The plugin preserves those fields and infers the rest.

## Defaults

For every inferred prop, the plugin generates:

- `attribute`: the kebab-cased prop name
- `reflect`: `true`
- `type`: the inferred Svelte custom element type, or `"String"` when no type can be resolved

## Current Limitations

- The plugin inspects Svelte 5 `$props()` declarations.
- Use a string literal tag or the object form. The plugin does not support the
  bare `customElement` boolean or an interpolated tag such as
  `customElement="{x}"`.
- The plugin does not resolve imported prop types. Declare type aliases and
  interfaces in the component instance script.
- The plugin does not resolve generic or complex TypeScript types. It maps
  unknown types to `"String"` and interface references to `"Object"`.
