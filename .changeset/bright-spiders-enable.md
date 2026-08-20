---
"@svebcomponents/build": patch
"@svebcomponents/ssr": patch
---

Automatically enable Svelte's async server runtime from generated `/ssr`
entries when the component package uses `compilerOptions.experimental.async`.
Host apps no longer need to import `@svebcomponents/ssr/enable-async` manually.

Svelte gates async SSR behind a process-wide flag that a component package's
own server bundle cannot flip — it carries its own copy of Svelte, while
`render()` runs on the copy `@svebcomponents/ssr` imports. Every non-Svelte
host therefore had to know about the flag and import it in the right place, in
the right order, or async components threw `await_invalid` at render time. The
component package already declares whether it needs the flag; its generated
renderer entry now carries the import itself.

`@svebcomponents/ssr/enable-async` remains exported for hand-written renderer
entries.
