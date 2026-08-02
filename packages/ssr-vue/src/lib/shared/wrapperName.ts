/**
 * The component name custom element tags are rewritten to by the Vite plugin,
 * and that the wrapper must be registered under for those tags to resolve.
 *
 * Kept in its own module so the runtime entry can reference it without pulling
 * the Vite plugin's build-time dependencies (`@vue/compiler-dom`,
 * `magic-string`) into a browser bundle.
 */
export const WRAPPER_COMPONENT_NAME = "SvebcomponentsCustomElementWrapper";

/** The prop the rewritten tag name is passed to the wrapper through. */
export const TAG_NAME_PROP = "_tagName";
