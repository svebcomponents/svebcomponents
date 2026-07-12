---
"@svebcomponents/auto-options": minor
---

Only reflect scalar props to attributes by default.

Previously every inferred prop defaulted to `reflect: true`, including `Object` and `Array` props and props whose type couldn't be resolved. Reflecting a non-scalar prop serializes the whole value into an attribute on every change — an anti-pattern that, for large values (e.g. a preloaded data object), writes hundreds of KB of JSON onto the host element. It also forced components with such a prop to hand-write `<svelte:options customElement>` just to opt out, which in turn dropped the component's CSS from SSR output (a flash of unstyled content).

Now:

- `String` / `Number` / `Boolean` props reflect by default (unchanged).
- `Object` / `Array` props default to `reflect: false`.
- Props whose type couldn't be resolved (typically an imported type) fall back to the `String` converter but also default to `reflect: false`, since an unresolved type is almost never a scalar meant for an attribute.

Explicit `reflect` values in `<svelte:options customElement={{ props }}>` are still honored, so this only changes the inferred default.
