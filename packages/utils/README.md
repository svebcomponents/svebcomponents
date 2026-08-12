Small shared helpers used by the svebcomponents packages.

`@svebcomponents/auto-options` and `@svebcomponents/ssr` install this package as
a transitive dependency. It keeps their shared string transformations in one
place.

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

## Registering custom elements

Declare the tag in the component and let `@svebcomponents/build` register it.
See
[Authoring components](https://svebcomponents.dev/authoring/#declaring-the-tag).
