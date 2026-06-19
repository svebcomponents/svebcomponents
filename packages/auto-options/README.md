Infer Svelte custom element prop options from `$props()`.

Svelte custom elements need prop metadata to expose component props as HTML attributes. Writing that metadata by hand gets repetitive, especially when the same information already exists in your TypeScript props.

`@svebcomponents/auto-options` is a build plugin that reads a Svelte component's instance script, infers prop names and primitive prop types from `$props()`, and injects or updates `<svelte:options customElement={...} />`.

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

is transformed before the Svelte compiler runs:

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

If you build with `@svebcomponents/build`, no extra setup is needed. The generated tsdown config already runs `@svebcomponents/auto-options` before compiling Svelte.

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

Then expose the compiled custom element from your package entrypoint:

```ts
import Component from "./Component.svelte";

if (!customElements.get("favorite-number") && Component.element) {
  customElements.define("favorite-number", Component.element);
}

export default Component;
```

`auto-options` generates the prop metadata Svelte needs for attribute conversion, but the component still has to be compiled and registered as a custom element. Without that custom element output, attributes such as `favorite-number="42"` will stay strings.

If you prefer defining the tag in the component itself, use the object form so `auto-options` can add the inferred `props` field:

```svelte
<svelte:options
  customElement={{
    tag: "favorite-number",
  }}
/>
```

## What Gets Inferred

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

Props without TypeScript type information are still added, but default to `"String"` because HTML attributes are strings by default.

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

Manual custom element options are treated as the highest-priority source of truth.

```svelte
<svelte:options
  customElement={{
    props: {
      count: { type: "String", attribute: "data-count" },
    },
  }}
/>
```

If the plugin later infers `count` as a number, the existing `type` and `attribute` values are preserved. Missing fields and newly discovered props are still filled in.

Use this as the escape hatch when inference is wrong or incomplete. You can manually define one prop, several props, or the entire `props` object; the plugin will preserve the fields you wrote and infer the rest where it can.

## Defaults

For every inferred prop, the plugin generates:

- `attribute`: the kebab-cased prop name
- `reflect`: `true`
- `type`: the inferred Svelte custom element type, or `"String"` when no type can be resolved

## Current Limitations

- Only Svelte 5 `$props()` declarations are inspected.
- `customElement="tag-name"` string syntax is not supported; use the object form of `customElement` options.
- Imported prop types are not resolved. Type aliases and interfaces must be declared in the same component instance script to be inspected.
- Generic and complex TypeScript types are not fully resolved. Unknown types fall back to `"String"` unless they are interface references, which are treated as `"Object"`.
