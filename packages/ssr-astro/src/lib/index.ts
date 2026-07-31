import type { AstroIntegration } from "astro";

import {
  vitePluginSvebcomponentsSsrAstro,
  type VitePluginSvebcomponentsSsrAstroOptions,
} from "./vite/vitePluginSvebcomponentsSsrAstro.js";

export {
  vitePluginSvebcomponentsSsrAstro,
  type VitePluginSvebcomponentsSsrAstroOptions,
} from "./vite/vitePluginSvebcomponentsSsrAstro.js";
export { WRAPPER_COMPONENT_NAME } from "./shared/wrapperName.js";

/**
 * Astro integration that server-renders custom elements in `.astro`
 * templates.
 *
 * ```ts
 * import svebcomponents from "@svebcomponents/ssr-astro";
 *
 * export default defineConfig({
 *   integrations: [svebcomponents()],
 * });
 * ```
 *
 * Nothing else is required. Astro ships no client JavaScript for these
 * elements, so there is no client-side counterpart to register: the browser
 * parses the emitted declarative shadow DOM, and the element upgrades and
 * hydrates itself.
 *
 * Note this is deliberately *not* an Astro renderer in the `addRenderer()`
 * sense. That API is for UI-framework components used as islands, with
 * `client:*` directives. A custom element is not an island — it hydrates
 * itself — so it needs the template rewrite this integration performs, not a
 * renderer registration.
 */
export const svebcomponents = (
  options: VitePluginSvebcomponentsSsrAstroOptions = {},
): AstroIntegration => ({
  name: "@svebcomponents/ssr-astro",
  hooks: {
    "astro:config:setup": ({ updateConfig }) => {
      updateConfig({
        vite: {
          // Astro bundles its own copy of Vite's types, which are structurally
          // incompatible with the ones this package compiles against even
          // though the plugin object is identical at runtime. The cast is at
          // this boundary only.
          plugins: [
            vitePluginSvebcomponentsSsrAstro(options) as unknown as NonNullable<
              NonNullable<Parameters<typeof updateConfig>[0]["vite"]>["plugins"]
            >[number],
          ],
        },
      });
    },
  },
});

export default svebcomponents;
