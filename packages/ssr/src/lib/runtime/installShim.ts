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

globalThis.Element = Element;
globalThis.HTMLElement = HTMLElement;
globalThis.customElements = new CustomElementRegistry();
