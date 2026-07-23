---
"@svebcomponents/ssr": patch
---

SSR wrappers now recognize `SvelteCustomElementRenderer` subclasses across separate bundled and external module instances. A consuming app can leave a normally compiled svebcomponent external without the wrapper's nominal `instanceof` check rejecting its registered renderer, so the component package no longer needs its own `ssr.noExternal` entry.
