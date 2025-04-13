// this import has to occur first, as it sets up the global this to allow for the other imports to work
import "./runtime/installShim.js";
export * from "./runtime/rendererRegistry.js";
export * from "./runtime/svelteCustomElementRenderer.js";
