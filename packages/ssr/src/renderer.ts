import {
  ElementRenderer,
  type RenderInfo,
  type RenderResult,
} from "@lit-labs/ssr";
import type { Component } from "svelte";
import { render } from "svelte/server";

// Base class for svelte custom element renderers
export class SvelteCustomElementRenderer extends ElementRenderer {
  private readonly attributes: Record<string, string> = {};
  private readonly properties: Record<string, any> = {};

  constructor(
    private svelteSsrComponent: Component,
    tagName: string,
    // maybe pass in custom element manifest here?
  ) {
    super(tagName);
  }

  override setAttribute(name: string, value: string) {
    // Browser turns all HTML attributes to lowercase.
    this.attributes[name.toLowerCase()] = value;
    // TODO: transform attributes to props as only they can be passed to the svelte ssr renderer
    // this.properties[name] = convert(value);
    // the converter information could come from custom element manifest?
  }

  override *renderAttributes(): RenderResult {
    for (const [name, value] of Object.entries(this.attributes)) {
      yield ` ${name}="${value}"`;
    }
  }

  override setProperty(name: string, value: any) {
    this.properties[name] = value;
    // TODO: "reflect" property to the attributes
    // this.setAttribute(name, value);
  }

  override *renderShadow(_renderInfo: RenderInfo): RenderResult | undefined {
    const { body, head } = render(this.svelteSsrComponent, {
      props: { userName: "test" },
    });
    yield head;
    yield body;
  }
}
