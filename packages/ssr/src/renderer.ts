import {
  ElementRenderer,
  type RenderInfo,
  type RenderResult,
} from "@lit-labs/ssr";
import type { Component } from "svelte";
import { render } from "svelte/server";

interface SvelteClientCustomElement {
  new (): SvelteClientCustomElement;
  attributes: Record<string, string>;
  attributeChangedCallback: (
    name: string,
    oldValue: string,
    newValue: string,
  ) => void;
  ["$$d"]: Record<string, any>;
  ["$$c"]: Component;
}

// Base class for svelte custom element renderers
export class SvelteCustomElementRenderer
  extends ElementRenderer
  implements ElementRenderer
{
  private readonly svelteClientCustomElement: SvelteClientCustomElement;

  constructor(
    private svelteSsrComponent: Component,
    SvelteClientCustomElementCtor: any,
    tagName: string,
  ) {
    super(tagName);
    this.svelteClientCustomElement = new SvelteClientCustomElementCtor();
  }

  override setAttribute(name: string, value: string) {
    // Browser turns all HTML attributes to lowercase.
    if (typeof value !== "string") {
      this.svelteClientCustomElement.$$d[name] = value;
      // maybe do something to reflect the prop to the attributes, perhaps 'this.$$me' does this out of the box for us?
      return;
    }
    this.svelteClientCustomElement.attributeChangedCallback(name, value, value);
  }

  override *renderAttributes(): RenderResult {
    const attributes = this.svelteClientCustomElement.attributes;
    for (const [name, value] of Object.entries(attributes)) {
      yield ` ${name}="${value}"`;
    }
  }

  override setProperty(name: string, value: any) {
    this.svelteClientCustomElement.$$d[name] = value;
  }

  override *renderShadow(_renderInfo: RenderInfo): RenderResult | undefined {
    const { body, head } = render(this.svelteSsrComponent, {
      props: this.svelteClientCustomElement.$$d,
    });
    yield head;
    yield body;
  }
}
