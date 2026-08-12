# svebcomponents

While svelte already allows for compiling components into custom elements, building a web-component library with this is boilerplate-heavy, requires you to set up a complex build pipeline & lacks features such as server-side rendering via declarative shadow dom or generation of custom element manifests.
`svebcomponents` is a battery-included toolkit for building **boilerplate-free, type-safe, server-renderable web components with Svelte:**

|                             | Svelte `customElement: true`                        | With svebcomponents                              |
| --------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| Attribute types, reflection | hand-written `<svelte:options customElement={...}>` | inferred from your `$props()` types              |
| Packaging                   | assemble your own pipeline                          | `package.json` exports _are_ the config          |
| Types for consumers         | none                                                | `.d.ts` plus a custom elements manifest          |
| Server rendering            | none                                                | declarative shadow DOM via Lit's ElementRenderer |
| Hydration                   | shadow root wiped, component re-mounted             | server DOM adopted in place                      |
| Evaluated twice             | `customElements.define` throws                      | idempotent                                       |

> [!NOTE]
> svebcomponents is in beta. APIs may change before 1.0. The changelogs
> document breaking changes.

## Documentation

Read the docs at [svebcomponents.dev](https://svebcomponents.dev/).

- [What is svebcomponents?](https://svebcomponents.dev/introduction/): the
  problems it solves and where it fits.
- [Getting Started](https://svebcomponents.dev/getting-started/): build and
  consume your first component package.
- [Authoring components](https://svebcomponents.dev/authoring/): props,
  events, slots and styling.
- [Compatibility](https://svebcomponents.dev/reference/compatibility/):
  supported Svelte, Node and host framework versions.

## Packages

| Package                                                                             | Status | What it does                                                                                     |
| ----------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------ |
| [`@svebcomponents/build`](https://svebcomponents.dev/packages/build/)               | Beta   | The `svebcomponents` CLI. Zero-config builds, TypeScript declarations, custom elements manifest. |
| [`@svebcomponents/auto-options`](https://svebcomponents.dev/packages/auto-options/) | Beta   | Infers custom element prop metadata from your TypeScript props.                                  |
| [`@svebcomponents/ssr`](https://svebcomponents.dev/packages/ssr/)                   | Beta   | Server-renderable builds, and rendering custom elements in SvelteKit and other Vite SSR apps.    |
| [`@svebcomponents/ssr-vue`](https://svebcomponents.dev/packages/ssr-vue/)           | Beta   | The same server rendering, inside a Vue app.                                                     |
| [`@svebcomponents/ssr-react`](https://svebcomponents.dev/packages/ssr-react/)       | Beta   | The same server rendering, inside a React app.                                                   |
| [`@svebcomponents/ssr-astro`](https://svebcomponents.dev/packages/ssr-astro/)       | Beta   | The same server rendering, inside an Astro app.                                                  |

The SSR pipeline renders any custom element with a registered `ElementRenderer`, including web components built with other frameworks.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
