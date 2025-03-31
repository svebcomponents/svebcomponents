import type { Plugin, ResolveIdResult } from "rollup";

const pluginName = "svebcomponents:override-svelte-ssr-slot-implementation";
const VIRTUAL_MODULE_ID =
  "svebcomponents:override-svelte-ssr-slot-implementation-virtual-module";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;
const SVELTE_INTERNAL_SERVER = "svelte/internal/server";

export function pluginOverrideSvelteSsrSlotImplementation(): Plugin {
  return {
    name: pluginName,

    /**
     * Intercept attempts to resolve svelte/internal/server
     */
    resolveId(source, importer): ResolveIdResult {
      // only intercept actual attempts to resolve 'svelte/internal/server'
      if (source !== SVELTE_INTERNAL_SERVER) return null;
      // base case: if the virtual module tries to import itself, return null to resolve the actual import
      if (importer === RESOLVED_VIRTUAL_MODULE_ID) return null;

      return RESOLVED_VIRTUAL_MODULE_ID;
    },

    load(id): string | null {
      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return `
// --- virtual module: ${VIRTUAL_MODULE_ID} ---
// import & reexport everything from the original module.
export * from 'svelte/internal/server';
// use 'attr' from svelte internal, because we depend on internal anyways & it has escaping built-in
import { attr } from 'svelte/internal/client';

/**
 * override the original slot function for usage with '@svebcomponents/ssr'.
 * this is necessary since '<slot>' elements are still transpiled to 'slot()' calls in svelte 5.
 * once they are no longer transformed (presumably in svelte 6), this function override should be removed.
 * @param {Payload} payload
 * @param {Record<string, any>} _props
 * @param {string} name
 * @param {Record<string, unknown>} slot_props
 * @param {null | (() => void)} fallback_fn
 * @returns {void}
 */
function slot(payload, _props, name, slot_props, fallback_fn) {
  // default slots have no name in web component land
  if (name === "default") name = null;
  let attrs = attr('name', name);
  for (const key in slot_props) {
    const val = slot_props[key];
    attrs += attr(key, val, typeof val === 'boolean');
  }
  payload.out += \`<slot\${attrs}>\`;
  fallback_fn?.();
  payload.out += \`</slot>\`;
}

// Override 'slot()' from 'svelte/internal/server' with our implementation
export { slot };

// --- End of virtual module ${VIRTUAL_MODULE_ID} ---
        `;
      }
      return null; // Let Rollup load other modules normally
    },
  };
}
