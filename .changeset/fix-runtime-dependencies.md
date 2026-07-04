---
"@svebcomponents/ssr": patch
"@svebcomponents/build": patch
---

Drop test and build tooling from runtime dependencies: `vitest`, `rolldown`, `typescript`, and `tslib` are no longer installed when consuming `@svebcomponents/ssr`, and `typescript`/`tslib` are no longer installed when consuming `@svebcomponents/build`. These were only used for tests, type-only imports, or package builds and are now devDependencies (or removed entirely).
