import {
  ElementRenderer,
  type RenderInfo,
  type RenderResult,
} from "@lit-labs/ssr";
import type { Component } from "svelte";
import { render } from "svelte/server";

// TODO: write a ElementRendererRegistry that can be used inside svelte kit to register a custom element renderer
// then, implement a component that first sets all attributes and properties and then renders the custom element
// like this:
// const renderer = renderers.get(MyElement);
// const instance = new renderer();
// instance.setAttribute("foo", "bar");
// instance.setProperty("baz", "qux");
// yield `<my-element `;
// yield* instance.renderAttributes();
// const shadowContents = instance.renderShadow(renderInfo);
// if (shadowContents !== undefined) {
//   yield '<template shadowroot="open">';
//   yield* shadowContents;
//   yield '</template>';
// }
// yield `</my-element>`;
// }

export class SvelteCustomElemenRenderer extends ElementRenderer {
  private readonly attributes: Record<string, string> = {};
  private readonly properties: Record<string, any> = {};

  override setAttribute(name: string, value: string) {
    // Browser turns all HTML attributes to lowercase.
    this.attributes[name.toLowerCase()] = value;
    // TODO: transform attributes to props as only they can be passed to the svelte ssr renderer
    // this.properties[name] = convert(value);
  }

  override setProperty(name: string, value: any) {
    this.properties[name] = value;
    // if necessary "reflect" a property to the attributes
    // this.setAttribute(name, value);
  }

  constructor(
    private svelteSsrComponent: Component,
    tagName: string,
  ) {
    super(tagName);
  }

  override *renderAttributes(): RenderResult {
    for (const [name, value] of Object.entries(this.attributes)) {
      yield ` ${name}="${value}"`;
    }
  }

  override *renderShadow(_renderInfo: RenderInfo): RenderResult | undefined {
    const { body, head } = render(this.svelteSsrComponent, {
      props: { userName: "test" },
    });
    yield head;
    yield body;
  }
}
