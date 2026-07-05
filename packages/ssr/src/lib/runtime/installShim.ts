import {
  HTMLElement,
  Element,
  CustomElementRegistry,
} from "@lit-labs/ssr-dom-shim";

declare const globalThis: {
  Element: typeof Element;
  HTMLElement: typeof HTMLElement;
  customElements: InstanceType<typeof CustomElementRegistry>;
};

// Only install each global when it isn't already defined. An environment may
// already have some (but not all) of these set up by another copy/version of
// this package, @lit-labs/ssr itself, or a jsdom-based test setup — clobbering
// them would silently drop any custom elements already registered there.
globalThis.Element ??= Element;
globalThis.HTMLElement ??= HTMLElement;
globalThis.customElements ??= new CustomElementRegistry();
