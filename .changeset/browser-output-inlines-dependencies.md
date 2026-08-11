---
"@svebcomponents/build": minor
---

Inline every bare specifier into the browser output, instead of inferring what
to bundle from `dependencies` vs `devDependencies`.

`dist/client` is a final-form browser artifact — loaded from a URL, or from a
bundle that already resolved everything. There is no module resolver at that
point. tsdown's default is to externalize whatever `package.json` lists as a
`dependency` or `peerDependency`, which answers a different question: what a
consumer must install. The two coincide most of the time, and every time they
did not, the build wrote a file no browser could load and reported success.

Three separate ways to hit it, all found while migrating two real projects:

- A component importing a package it declares as a `dependency` — which it must
  declare, if its published element types name a type from that package.
- Declaring `svelte`, which is the documented way to register element types with
  Svelte's template types. The standalone bundle went from ~38 kB with the
  runtime to ~4 kB with a bare `svelte` import.
- `@svebcomponents/ssr`'s hydration entries, when a component declares that
  package as the optional peer dependency it is meant to be. That one had a
  targeted workaround; the other two did not.

The browser builds now state the contract rather than infer it. Left external:
Node builtins (a browser bundle importing `node:fs` is broken either way, and
inlining one turns a dependency's dead branch into a build error), relative and
absolute paths, virtual modules, and protocol imports. A specifier that is
inlined but cannot be resolved now fails the build, so this class of mistake is
loud rather than silent.

Server output is unchanged: Node resolves declared dependencies at runtime, so
it keeps ordinary externalization. The Svelte-aware build (`svelteOutDir`, the
`svelte` export condition) still externalizes `svelte` — sharing the host
application's runtime is that output's entire purpose.

## Migration

Nothing to do in most packages, and several can delete a workaround: a
dependency that had to be a `devDependency` to stay in the bundle can now be
declared for what it is.

Bundles grow for anyone who was relying on `dependencies` being externalized
from `dist/client`. That output was not loadable as documented, but if you were
depending on it deliberately — a package the host provides, say — opt out:

```json
{
  "svebcomponents": { "neverBundle": ["@acme/design-system"] }
}
```

`defineConfig` takes the same list as a `neverBundle` option. Entries are
matched against the whole import specifier, so cover subpaths too if the package
has them.
