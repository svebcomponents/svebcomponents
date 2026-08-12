`@svebcomponents/utils` contains shared string and tag-name helpers for the
svebcomponents packages. Most projects receive it as a transitive dependency
of `@svebcomponents/auto-options` or an SSR integration.

## API

| Function                                 | Result                                                                                    |
| ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| `kebabize("favoriteNumber")`             | `"favorite-number"`                                                                       |
| `camelizeKebabCase("favorite-number")`   | `"favoriteNumber"`                                                                        |
| `isKebabCase("favorite-number")`         | `true` for the lowercase attribute-name subset that the SSR prop mapper accepts           |
| `mayBeCustomElementTagName("my-card")`   | `true` when the string contains a dash                                                    |
| `isValidCustomElementTagName("my-card")` | `true` for supported HTML custom-element names, excluding names reserved by SVG or MathML |

```ts
import {
  camelizeKebabCase,
  isValidCustomElementTagName,
  kebabize,
} from "@svebcomponents/utils";
```

These helpers form an internal boundary between the build and SSR packages.
Their behavior follows the needs of those packages and may change before 1.0.

See [Author components](https://svebcomponents.dev/authoring/) for tag and prop
naming conventions.
