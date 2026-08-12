---
"@svebcomponents/build": minor
---

Describe properties as well as attributes in the Svelte template types.

A custom element's public surface is both, and the generated
`svelte/elements` augmentation only ever described attributes. So a Svelte
template could not pass anything that does not survive being turned into a
string — an object, an array — because the only member offered was the
kebab-cased attribute:

```svelte
<!-- the element's own documented integration path -->
<atproto-comments thread={uri} threadData={data.thread}></atproto-comments>
```

```
'"threadData"' does not exist in type
'HTMLAttributes<AtprotoCommentsElement> & { thread?: string; "thread-data"?: any; … }'
```

`thread-data={obj}` is not the workaround it looks like: with no property of
that name, Svelte writes an attribute and the object is stringified. The
camelCase form is the only way to pass one, and it was the one form the types
did not admit — so opting into template types broke the integration it was
meant to check.

Each prop now also appears under its camelCase name with its real type, rather
than the attribute's widened `T | string`. Two are left out: props whose
attribute name already equals the prop name (`count`), which the attribute
member covers and which would otherwise be a duplicate key; and `on`-prefixed
props, which Svelte reads as event-handler syntax rather than a property
assignment.

Hand-written augmentations — the React and Vue recipes, and the Svelte one for
packages that do not expose their generated types — compose `XAttributes`,
which remains the attribute surface. Add the property members you need for
non-serialisable props there; the exported `XElement` interface types them.
