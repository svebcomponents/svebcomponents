# Internal config packages

The private `configs/*` packages share tooling across the monorepo.

They are not part of the public svebcomponents API.

## `@svebcomponents/eslint-config`

Exports:

- `@svebcomponents/eslint-config/base`
- `@svebcomponents/eslint-config/svelte`

The base config combines:

- ESLint recommended JavaScript rules
- `typescript-eslint` recommended rules
- Prettier compatibility
- browser and Node globals
- repository `.gitignore` handling
- ignored `dist/**`, `.svelte-kit/**`, and fixture directories

The Svelte config extends the base config with `eslint-plugin-svelte` recommended and Prettier-compatible rules, plus parser settings for `.svelte`, `.svelte.ts`, and `.svelte.js` files.

Use `base` for plain TypeScript packages and `svelte` for packages that contain Svelte files.

## `@svebcomponents/prettier-config`

Exports:

- `@svebcomponents/prettier-config/base`
- `@svebcomponents/prettier-config/svelte`

The base config is empty. The Svelte config adds `prettier-plugin-svelte` and a `*.svelte` parser override.

Use `base` for plain TypeScript packages and `svelte` for packages that contain Svelte files.

## `@svebcomponents/typescript-config`

Exports:

- `@svebcomponents/typescript-config/base`
- `@svebcomponents/typescript-config/node`
- `@svebcomponents/typescript-config/svelte`

The base config extends `@tsconfig/strictest` and enables strict, declaration-emitting, bundler-style TypeScript settings for browser-oriented packages.

The node config also extends `@tsconfig/strictest`, but uses `module` and `moduleResolution` set to `nodenext`.

The Svelte config extends the base config plus `@tsconfig/svelte`.

## `@svebcomponents/vitest-config`

Exports:

- `@svebcomponents/vitest-config`
- `@svebcomponents/vitest-config/ssr`
- `@svebcomponents/vitest-config/node`

The base config defines a browser test project using Playwright/Chromium and the client component test convention:

```txt
test/client/setup.ts
test/client/component.test.ts
```

The SSR config extends the base config with a server-side test project matching:

```txt
test/server/*.test.ts
```

The `e2e/*` packages use both configs for integration tests.

The node config runs `packages/*` tests against `src` and excludes build output
from discovery. Vitest does not exclude `dist/**` or `.svelte-kit/**`, so a
built package could run each suite from both its source and a stale compiled
copy.
