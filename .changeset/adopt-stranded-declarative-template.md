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

This ordering occurs whenever a host parses serialized markup after the
element definition has loaded, including content streamed into a Suspense
boundary. Such elements now adopt the matching stranded template themselves,
so server-rendered hydration works there as it already did on first paint.
