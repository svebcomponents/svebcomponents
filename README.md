# svebcomponents

[Svelte has a compiler mode for custom elements](https://svelte.dev/docs/svelte/custom-elements).
Building a library with it takes more work: you have to supply attribute
metadata, configure several build targets, generate consumer types, and handle
server rendering.

svebcomponents is a toolkit for boilerplate-free, type-safe, server-renderable
web components with Svelte. It adds:

- `customElement.props` metadata inferred from `$props()` types
- browser and server builds derived from package exports
- TypeScript declarations and a custom elements manifest
- host adapters that emit declarative shadow DOM, plus a custom-element
  extension that hydrates it

You declare each component API once in Svelte. svebcomponents configures the
compiler and generates the package around it.

> [!NOTE]
> svebcomponents is in beta. APIs may change before 1.0.

## Documentation

Read the docs at [svebcomponents.dev](https://svebcomponents.dev/).

- [Why svebcomponents](https://svebcomponents.dev/introduction/): how the
  toolkit builds on Svelte's custom-element compiler mode
- [Quickstart](https://svebcomponents.dev/getting-started/): create and build a
  component package
- [Authoring components](https://svebcomponents.dev/authoring/): props,
  events, slots, and styles
- [Server rendering](https://svebcomponents.dev/server-rendering/): add
  declarative shadow DOM and hydration to a host app
- [Compatibility](https://svebcomponents.dev/reference/compatibility/):
  supported Svelte, Node, and host framework versions

## Packages

| Package                                                                             | What it adds                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [`@svebcomponents/build`](https://svebcomponents.dev/packages/build/)               | Build CLI, declarations, and custom elements manifest   |
| [`@svebcomponents/auto-options`](https://svebcomponents.dev/packages/auto-options/) | `customElement.props` metadata inferred from TypeScript |
| [`@svebcomponents/ssr`](https://svebcomponents.dev/packages/ssr/)                   | Server renderer, hydration, and SvelteKit integration   |
| [`@svebcomponents/ssr-vue`](https://svebcomponents.dev/packages/ssr-vue/)           | Vue SSR integration                                     |
| [`@svebcomponents/ssr-react`](https://svebcomponents.dev/packages/ssr-react/)       | React SSR integration                                   |
| [`@svebcomponents/ssr-astro`](https://svebcomponents.dev/packages/ssr-astro/)       | Astro SSR integration                                   |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
