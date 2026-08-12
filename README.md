# svebcomponents

[Svelte can compile components into custom elements](https://svelte.dev/docs/svelte/custom-elements).
Building a library around those elements takes more work: you have to supply
attribute metadata, configure several build targets, generate consumer types,
and handle server rendering.

svebcomponents is a toolkit for boilerplate-free, type-safe, server-renderable
web components with Svelte. It adds:

- attribute options inferred from `$props()` types
- browser bundles, TypeScript declarations, and a custom elements manifest
- declarative shadow DOM with hydration
- SSR integrations for Svelte, React, Vue, and Astro

Svelte owns the component and custom-element APIs. svebcomponents packages the
compiled output and adds the library tooling around it.

> [!NOTE]
> svebcomponents is in beta. APIs may change before 1.0.

## Documentation

Read the docs at [svebcomponents.dev](https://svebcomponents.dev/).

- [Svelte custom elements](https://svebcomponents.dev/introduction/): how
  Svelte custom elements work and where the toolkit fits
- [Getting Started](https://svebcomponents.dev/getting-started/): create and
  run a project
- [Authoring components](https://svebcomponents.dev/authoring/): props,
  events, slots, and styles
- [Compatibility](https://svebcomponents.dev/reference/compatibility/):
  supported Svelte, Node, and host framework versions

## Packages

| Package | What it adds |
| --- | --- |
| [`@svebcomponents/build`](https://svebcomponents.dev/packages/build/) | Build CLI, declarations, and custom elements manifest |
| [`@svebcomponents/auto-options`](https://svebcomponents.dev/packages/auto-options/) | Svelte custom-element prop options inferred from TypeScript |
| [`@svebcomponents/ssr`](https://svebcomponents.dev/packages/ssr/) | Server output, declarative shadow DOM, and SvelteKit integration |
| [`@svebcomponents/ssr-vue`](https://svebcomponents.dev/packages/ssr-vue/) | Vue SSR integration |
| [`@svebcomponents/ssr-react`](https://svebcomponents.dev/packages/ssr-react/) | React SSR integration |
| [`@svebcomponents/ssr-astro`](https://svebcomponents.dev/packages/ssr-astro/) | Astro SSR integration |

The SSR pipeline accepts any custom element with a registered
`ElementRenderer`, including elements built with other frameworks.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
