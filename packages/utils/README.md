Small shared helpers used by Svebcomponents packages.

This package is intentionally narrow. It keeps common string transformations in one place so the build-time and runtime packages agree on how prop names and attribute names map to each other.

## Exports

### `kebabize(str)`

Converts camelCase or PascalCase names to kebab-case.

```ts
import { kebabize } from "@svebcomponents/utils";

kebabize("favoriteNumber"); // "favorite-number"
kebabize("URLValue"); // "url-value"
```

Used by `@svebcomponents/auto-options` when generating custom element attribute names from Svelte prop names.

### `isKebabCase(str)`

Checks whether a string is already a simple kebab-case HTML attribute name.

```ts
import { isKebabCase } from "@svebcomponents/utils";

isKebabCase("favorite-number"); // true
isKebabCase("favoriteNumber"); // false
isKebabCase("--css-variable"); // false
```

Used by `@svebcomponents/ssr` when deciding whether an incoming wrapper prop should be treated as an attribute name or a JavaScript property name.

### `camelizeKebabCase(str)`

Converts kebab-case names back to camelCase.

```ts
import { camelizeKebabCase } from "@svebcomponents/utils";

camelizeKebabCase("favorite-number"); // "favoriteNumber"
```

Used by `@svebcomponents/ssr` when mapping non-string kebab-case values to component properties during server rendering.

### `defineElement(tagName, component)`

Manually registers a compiled custom element, guarding against the ways a
bare `customElements.define()` call can fail: no `customElements` registry
(SSR before the DOM shim installs), no compiled constructor (`component`
wasn't built with `customElement: true`, e.g. the server build), or the tag
already being registered (first registration wins).

```ts
import { defineElement } from "@svebcomponents/utils";
import MyComponent from "./MyComponent.svelte";

export default MyComponent;
defineElement("my-component", MyComponent);
```

Components built with `@svebcomponents/build` don't need this: declaring the
tag in `<svelte:options customElement="my-component" />` is enough, since the
build already guards Svelte's own generated registration call. Reach for
`defineElement` only when a tag can't be a literal in `<svelte:options>` —
e.g. one computed at build time.
