---
"@svebcomponents/build": patch
---

Stop corrupting literal types that spell one of a component's local type names.

Generated declarations prefix a component's local types so several components
can share one declaration file (`Detail` becomes `Button$Detail`). The rewrite
matched names anywhere in the declaration's source text, including inside string
literals, so a literal type whose value happened to match a local type name was
rewritten too:

```ts
// source
interface Detail {
  id: string;
}
type Mode = "Detail" | "summary";

// generated, before
type MyWidget$Mode = "MyWidget$Detail" | "summary";
```

Consumers writing `mode="Detail"` — the value the element actually accepts — got
a type error, while the bogus `"MyWidget$Detail"` type-checked and failed at
runtime. Literals are now stepped over.

Two adjacent defects went with it: names are matched in a single alternation, so
a name introduced by an earlier rewrite can no longer be rewritten again; and
names are escaped when built into the pattern, so a local type containing `$`
no longer silently fails to match.
