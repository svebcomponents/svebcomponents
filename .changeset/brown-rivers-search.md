---
"@svebcomponents/ssr-react": patch
---

Document the investigation into async SSR under React's streaming renderer, and correct the README's explanation of why the integration is synchronous-only.

React's streaming renderer does preserve declarative shadow DOM: suspended content is delivered as ordinary HTML that the parser processes in a hidden staging container, so the shadow root attaches at parse time, and React's relocation script moves the element rather than the template. The remaining obstacle to async support is a wrapper design problem — `use()` needs a promise that is stable across render attempts — not a platform limitation.

The findings are asserted by browser tests in `e2e/ssr-react/test/experiments/` so a change in React's behavior fails rather than silently invalidating the note.

The documentation site's React integration section links to the findings rather than restating them.
