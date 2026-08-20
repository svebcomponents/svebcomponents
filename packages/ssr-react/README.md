`@svebcomponents/ssr-react` renders registered custom elements with declarative
shadow DOM in React 19 apps. The package is in beta.

## Setup

```bash
pnpm add @svebcomponents/ssr @svebcomponents/ssr-react svelte
```

Route dashed JSX tags through the package runtime:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@svebcomponents/ssr-react",
  },
}
```

Load your component package's browser entry in client code and its renderer
entry on the server. Then write the element as JSX:

```tsx
<my-component title="Hello" count={5} />
```

See the [React setup guide](https://svebcomponents.dev/server-rendering/react/)
for import placement in a server-rendered app.

## Wrapper component

Use `CustomElement` for explicit wrapping:

```tsx
import { CustomElement } from "@svebcomponents/ssr-react";

<CustomElement tag="my-component" title="Hello" count={5} />;
```

The server wrapper calls the registered Lit Labs `ElementRenderer` and places
the resulting template before the light-DOM children. On the client, React
renders the host tag; the browser has already parsed the shadow template. The
generated extension asks Svelte to hydrate it when the element upgrades.

The registry accepts renderers from other libraries when they implement the
same `ElementRenderer` contract.

## Async components

The default wrapper uses a synchronous render path. If a component awaits
during rendering, the wrapper emits the host element without shadow content
and logs one warning for its tag. The browser then renders that element.

React Server Components can await the renderer:

```tsx
import { CustomElement } from "@svebcomponents/ssr-react/rsc";

export default async function Page() {
  return <CustomElement tag="my-component" title="Hello" />;
}
```

Import `/rsc` from a Server Component. Client Components and plain React SSR
use the synchronous wrapper. A promise-returning preparation hook needs `/rsc`.
Enable `compilerOptions.experimental.async` in the component package when the
Svelte component itself awaits during rendering.

## Exports

| Export                                      | Use                                       |
| ------------------------------------------- | ----------------------------------------- |
| `@svebcomponents/ssr-react`                 | Synchronous `CustomElement` wrapper       |
| `@svebcomponents/ssr-react/jsx-runtime`     | Production JSX runtime                    |
| `@svebcomponents/ssr-react/jsx-dev-runtime` | Development JSX runtime                   |
| `@svebcomponents/ssr-react/rsc`             | Async wrapper for React Server Components |

## Limits

- Use React 19 and install Svelte in the server app.
- The JSX runtimes route valid dashed tag names and exclude reserved SVG and
  MathML names.
- The default wrapper renders async elements in the browser.
- The `/rsc` wrapper cannot run inside a Client Component.
- App code must load the component's browser entry and server renderer.

Read [Async components and server data](https://svebcomponents.dev/server-rendering/async/)
for the host support matrix.
