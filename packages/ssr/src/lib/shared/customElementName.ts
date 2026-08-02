/**
 * Custom-element name predicates shared between the build-time Vite transform
 * (`../vite/vitePluginSvebcomponentsSsr.ts`) and the SSR runtime
 * (`../runtime/html.ts`).
 *
 * These live in `@svebcomponents/utils` so the host integrations for other
 * frameworks can apply the same detection without importing this package's
 * Svelte-bound runtime. Re-exported here so this module's existing importers
 * (and its tests) keep their import path.
 */
export {
  mayBeCustomElementTagName,
  isValidCustomElementTagName,
} from "@svebcomponents/utils";
