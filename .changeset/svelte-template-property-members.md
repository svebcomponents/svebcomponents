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

## The attribute surface was over-promising too

`XAttributes` typed that same prop as `"thread-data"?: CommentTree | string`,
so both broken forms type-checked: passing the object stringifies it to
`"[object Object]"`, and passing a string hands the component a string where it
declared a `CommentTree`.

An attribute is a string. It now says so — except where the attribute name is
also the prop name (`count`), the one case where a framework assigns the
property rather than writing an attribute, and where `number | string` is
therefore right.

**This is a breaking change** for anyone passing a rich value through a
kebab-cased attribute. That code did not work; it now fails to compile instead
of silently stringifying.

## `XProps` for every framework

The property surface is exported per element as `XProps` — camelCase names,
real types — so the React, Vue and Svelte recipes can all compose it. React,
Vue and Svelte resolve a template binding the same way: assign a property when
the element has one, write an attribute otherwise, which is why none of them
could pass an object before.

Function and snippet props stay out of both surfaces: in a template
`onSelect={fn}` is event-handler syntax rather than a property assignment. They
remain typed on `XElement`, to be set through a DOM reference, and the docs now
say so explicitly rather than leaving it implied.
