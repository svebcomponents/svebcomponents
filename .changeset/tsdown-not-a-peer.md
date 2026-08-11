---
"@svebcomponents/build": minor
"@svebcomponents/ssr": minor
---

Depend on `tsdown` instead of asking consumers to install it.

`@svebcomponents/build` runs tsdown — `svebcomponents` imports `build()` and
calls it. A peer dependency says the opposite: that the host provides it. Every
consumer therefore had to install a build tool they never invoke, and pick a
version.

That is also what produced a whole class of silent breakage. The declared range
was `>=0.15.0` while the code depended on `deps.alwaysBundle`, which tsdown
introduced in 0.21.0. Package managers that auto-install peers resolve the
bottom of a range, so consumers got 0.15.x — which accepts the config, ignores
the option, and externalizes everything the build meant to inline. `dist/client`
then shipped bare specifiers no browser could resolve, and the build reported
success throughout.

tsdown is now an ordinary dependency, pinned to the version this repository
builds and tests against. There is no range for a consumer to get wrong, and
nothing to install.

`@svebcomponents/ssr` keeps `tsdown` and `rolldown` as optional peers — it only
imports their types, and `@svebcomponents/build` supplies them.

## Migration

Remove `tsdown` from your package if you added it only for this:

```diff
-  "devDependencies": { "tsdown": "^0.22.0" }
```

Keep it if you use tsdown directly for something else.
