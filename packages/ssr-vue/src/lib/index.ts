import type { App, Plugin } from "vue";

import { CustomElementWrapper } from "./runtime/CustomElementWrapper.js";
import { WRAPPER_COMPONENT_NAME } from "./shared/wrapperName.js";

export { CustomElementWrapper } from "./runtime/CustomElementWrapper.js";
export { WRAPPER_COMPONENT_NAME } from "./shared/wrapperName.js";

/**
 * Vue plugin that registers the custom element wrapper the compiler transform
 * retags custom elements to.
 *
 * ```ts
 * import { svebcomponents } from "@svebcomponents/ssr-vue";
 *
 * app.use(svebcomponents());
 * ```
 *
 * Install it on both the server and client app instances — the wrapper
 * renders on both sides, emitting declarative shadow DOM on the server and
 * the bare custom element tag in the browser.
 */
export const svebcomponents = (): Plugin => ({
  install(app: App) {
    app.component(WRAPPER_COMPONENT_NAME, CustomElementWrapper);
  },
});

export default svebcomponents;
