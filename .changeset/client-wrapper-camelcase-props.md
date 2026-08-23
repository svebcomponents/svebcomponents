---
"@svebcomponents/ssr": patch
---

Deliver camelCase props to client-rendered custom elements, instead of
silently dropping them.

A host that passed `<my-element showRoot threadData={tree}>` got both props on
a server render but neither on a client render, so the same page rendered
differently depending on how a visitor arrived — a SvelteKit client navigation
back to the page would quietly lose them, and a reload would bring them back.

The client wrapper renders the element as `<svelte:element this={tag}
{...props}>`. Svelte compiles that spread to `set_attributes`, which runs every
key through `normalize_attribute` — whose first step is `name.toLowerCase()` —
for elements in the HTML namespace. That is right for real HTML elements, whose
attribute names are case-insensitive, but a custom element's props are
case-sensitive: `showRoot` arrived as the attribute `showroot`, matching neither
the observed attribute `show-root` nor the element's `showRoot` setter, and
`threadData` arrived as `threaddata="[object Object]"`. `<svelte:element>`
cannot avoid that path — its tag name is only known at runtime, so Svelte
compiles even statically-named attributes on it to the spread path rather than
to the case-preserving `set_custom_element_data` it uses for a
compile-time-known custom element.

The wrapper now assigns any prop whose name contains an uppercase letter as a
JavaScript property, and spreads the rest as before. That matches what the
server wrapper already did (`startRender` routes every non-kebab-case key to
`setProperty`), so a server-rendered element and a client-rendered one finally
receive the same props. Props that do have an attribute representation — `class`,
`style`, `id`, `slot`, `part`, `data-*`, `aria-*`, `on*` handlers and every
kebab-case attribute — keep travelling as attributes, so Svelte's class/style
handling, event delegation and hydration are unaffected.
