# Svebcomponents

## What is `Svebcomponents`?

Building a one-off web component with Svelte is as easy as setting `customElement: true` in your Svelte config.

However, once you get into building a library of components boilerplate and configuration quickly add up and the developer experience is not as good as it could be.
`Svebcomponents` is a collection of tools that aim to smoothen the rough edges of building web components with Svelte.

## Packages

- [`@svebcomponents/build`]
  - Provides the `svebcomponents` CLI tool for building web components (based on rolldown ⚡).
  - By default, it offers a zero-configuration build experience.
  - For advanced configuration, create a `svebcomponents.config.ts` file in your project root and import `defineConfig` from `@svebcomponents/build` to define a custom Rolldown configuration.
- [`@svebcomponents/auto-options`]
  - automatically generate type converter & attribute settings from your props leveraging the typescript AST
- [`@svebcomponents/ssr`]
  - allows you to build SSR-able web components via `auto-options`
  - render web components that provide an `ElementRenderer` in SvelteKit (or other vite based SSR frameworks)
