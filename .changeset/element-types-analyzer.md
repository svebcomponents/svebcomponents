---
"@svebcomponents/auto-options": minor
---

Extract the component analysis into a reusable `analyzeComponent(code, id)`,
available as `@svebcomponents/auto-options/analyze`. The rollup transform now
consumes it rather than walking the AST itself, so prop inference and any
metadata consumer can never disagree about what a component exposes.

The analyzer additionally derives the component's documented surface: the
custom element tag (previously only the string shorthand of `customElement`
was captured, not the object form), prop JSDoc descriptions, declared
TypeScript type text and defaults, `<slot>` elements, events dispatched via
`$host().dispatchEvent(new CustomEvent<T>("name"))` including the explicit
detail type, and CSS custom properties the component reads but does not define.

`@component` JSDoc tags (`@slot`, `@event`, `@cssprop`) add descriptions and
can declare members the scan cannot see; they never override inferred
structure.
