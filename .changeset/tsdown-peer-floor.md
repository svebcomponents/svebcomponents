---
"@svebcomponents/build": minor
"@svebcomponents/ssr": minor
---

Raise the `tsdown` peer range to `>=0.22.0`.

Both packages declared `>=0.15.0` while relying on `deps.alwaysBundle`, which
tsdown only introduced in 0.21.0. Package managers that auto-install peers
resolve the bottom of a range, so a consumer who never named tsdown themselves
got 0.15.x — which accepts the config, ignores the option, and externalizes
everything the build meant to inline. `dist/client` then shipped bare
`@svebcomponents/ssr/hydration` and `hydration-host` specifiers and the element
never registered in a browser. The build reported success throughout.

0.22 rather than 0.21 is the floor because it is the version this repository
builds and tests against; the 0.3.5 release already updated the integrations for
it.

## Migration

Install `tsdown` explicitly in packages that run the build, and pin it:

```bash
pnpm add -D tsdown
```

An install that would previously have resolved a too-old tsdown now fails
loudly instead of producing a broken bundle.
