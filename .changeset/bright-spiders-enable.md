---
"@svebcomponents/build": patch
"@svebcomponents/ssr": minor
---

Automatically enable Svelte's async server runtime from generated `/ssr`
entries when the component package uses `compilerOptions.experimental.async`,
and remove the `@svebcomponents/ssr/enable-async` entry point that hosts used
to import by hand.

Svelte gates async SSR behind a process-wide flag that a component package's
own server bundle cannot flip — it carries its own copy of Svelte, while
`render()` runs on the copy `@svebcomponents/ssr` imports. Every non-Svelte
host therefore had to know about the flag and import it in the right place, in
the right order, or async components threw `await_invalid` at render time. The
component package already declares whether it needs the flag; its generated
renderer entry now calls the new `enableAsyncMode()` from `@svebcomponents/ssr`
itself.

If you import `@svebcomponents/ssr/enable-async` today, delete the import — a
rebuilt component package enables the mode on its own. A hand-written renderer
entry can `await enableAsyncMode()` from `@svebcomponents/ssr` instead.
