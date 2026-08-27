---
"@svebcomponents/ssr-react": patch
---

Fix server rendering under React Server Components

Both wrappers emitted the `<template shadowrootmode>` from a Server
Component. A Server Component's output is serialized into the Flight payload
and replayed in the browser, so the template was replayed too — against a DOM
where the HTML parser had already consumed it into a shadow root. React
reported the missing child as a hydration mismatch, discarded the
server-rendered DOM and re-created the template through DOM APIs, which
attaches no shadow root at all: the page lost both its shadow content and its
hydration.

The template is now emitted from a Client Component, which React runs in the
SSR pass and in the browser, so each side renders what belongs there. This
affects RSC hosts only; plain React SSR was already correct. During a client
transition there is no document parser, so the boundary renders the bare host
element and lets it mount from ordinary props. Values produced only inside
`SsrPrepare` remain document-rendered; pass them from the Server Component as
serializable props when the browser also needs them after a transition.
