---
"@svebcomponents/ssr": patch
---

Recover server-rendered content when the parser refuses a declarative shadow root

The HTML parser only honours `<template shadowrootmode>` while the host has no
shadow root. When an element's definition has already loaded, the element
upgrades on its start tag and svelte's constructor calls `attachShadow` before
the template is read, so the parser refuses it and leaves it in the light DOM.
The component then threw its server-rendered content away and re-rendered from
scratch, and the leftover template stayed behind as a stray light-DOM child —
which React reports as a hydration mismatch, discarding the subtree.

This ordering is what all markup arriving after the initial document looks
like: content streamed into a Suspense boundary, or built by a client-side
navigation. Such elements now adopt the stranded template themselves, so
server-rendered hydration works there as it already did on first paint.
