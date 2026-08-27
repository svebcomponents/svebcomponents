---
"@svebcomponents/ssr-react": minor
---

Route dashed tags through the async wrapper in Server Components

`jsxImportSource` is one app-wide setting, so it could only ever name one
runtime — the synchronous one, which degrades an asynchronous element to
client-only rendering. Reaching the async wrapper meant importing
`@svebcomponents/ssr-react/rsc` and writing `<CustomElement tag="…">` by hand,
which is the ergonomics `jsxImportSource` exists to remove.

The JSX runtime entries now carry a `react-server` export condition, so an RSC
runtime resolves a runtime that routes tags through the async wrapper while
Client Components keep the synchronous one. A plain `<my-component />` in a
Server Component now server-renders even when its renderer is asynchronous.
The `/rsc` export is unchanged and still works for explicit use.
