# `@svebcomponents/build`

`@svebcomponents/build` is a package that can be used to provide a rollup configuration for building web components with Svelte.

## Installation

```bash
npm install -D @svebcomponents/build
```

Since `@svebcomponents/build` only generates a config for rollup, you'll still need to have rollup installed.

## Usage

in your `rollup.config.js`, call `defineConfig` to generate rollup configs (by default it outputs an array of two configs, one for the regular web component & one for the server-side renderable version of the web component):

```js
import { defineConfig } from "@svebcomponents/build";

// config object with default values
const config = defineConfig({
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  entry: "src/index.ts",
  /**
   * Whether to generate an SSR entry file for the web component.
   */
  ssr: true,
});
export default config;
```

then you can build your project with `rollup -c` and it will generate a `dist` folder with the following files:

- `client/index.js` - the entrypoint for the web component
- `server/index.js` - the server-side-renderable web component (you don't need to use this file directly)
- `server/ssr.js` - the entrypoint for the ElementRenderer for SSR

ensure that you have the following in your `package.json`, so that both the client side web component & the `ElementRenderer` can be imported by your users:

```json
{
  "exports": {
    ".": {
      "import": "./dist/client/index.js"
    },
    "./ssr": {
      "import": "./dist/server/ssr.js"
    }
  }
}
```
