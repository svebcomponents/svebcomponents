import {
  ElementRenderer,
  type RenderInfo,
  type RenderResult,
} from "@lit-labs/ssr";
import type { Component } from "svelte";
import { render } from "svelte/server";

import {
  propValueToAttributeValue,
  renderSsrAttribute,
  type SvelteCustomElementPropDefinition,
} from "./html.js";

const headStyleTagRegex = /<style\b[^>]*>[\s\S]*?<\/style\s*>|<link\b[^>]*>/gi;
const relAttributeRegex = /\brel\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>=]+))/i;

const isStylesheetLink = (tag: string): boolean => {
  const match = relAttributeRegex.exec(tag);
  const rel = match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
  return rel.toLowerCase().split(/\s+/).includes("stylesheet");
};

/**
 * Svelte's server `render()` emits both injected component styles and
 * `<svelte:head>` content into `head`. Only style resources are valid inside
 * a shadow root, so we forward `<style>` and `<link rel="stylesheet">` tags
 * and drop document metadata such as `<title>`, `<meta>`, or non-stylesheet
 * `<link>` tags.
 */
export const extractShadowStylesFromHead = (head: string): string =>
  (head.match(headStyleTagRegex) ?? [])
    .filter((tag) => !/^<link/i.test(tag) || isStylesheetLink(tag))
    .join("");

export interface SvelteClientCustomElement {
  new (): Omit<SvelteClientCustomElement, "new">;
  attributes: Record<string, string>;
  attributeChangedCallback: (
    name: string,
    oldValue: string,
    newValue: string,
  ) => void;
  ["$$d"]: Record<string, unknown>;
  /**
   * Svelte's generated custom-element prop definition map. It tells us which
   * component props should reflect to host attributes during SSR.
   */
  ["$$p_d"]: Record<string, SvelteCustomElementPropDefinition>;
  ["$$c"]: Component;
}

// Base class for svelte custom element renderers
export class SvelteCustomElementRenderer
  extends ElementRenderer
  implements ElementRenderer
{
  private readonly ssrAttributes = new Map<string, string>();
  private readonly svelteClientCustomElement: SvelteClientCustomElement;

  constructor(
    private svelteSsrComponent: Component,
    SvelteClientCustomElementCtor: {
      new (): SvelteClientCustomElement;
    },
    tagName: string,
  ) {
    super(tagName);
    this.svelteClientCustomElement = new SvelteClientCustomElementCtor();
  }

  override setAttribute(name: string, value: string) {
    if (typeof value !== "string") {
      this.svelteClientCustomElement.$$d[name] = value;
      // maybe do something to reflect the prop to the attributes, perhaps 'this.$$me' does this out of the box for us?
      return;
    }
    name = name.toLowerCase();
    this.ssrAttributes.set(name, value);
    this.svelteClientCustomElement.attributeChangedCallback(name, value, value);
  }

  override *renderAttributes(): RenderResult {
    for (const [name, value] of this.ssrAttributes) {
      yield renderSsrAttribute(name, value);
    }
  }

  override setProperty(name: string, value: unknown) {
    this.svelteClientCustomElement.$$d[name] = value;
    this.reflectPropertyToAttribute(name, value);
  }

  override *renderShadow(_renderInfo: RenderInfo): RenderResult | undefined {
    const { body, head } = render(this.svelteSsrComponent, {
      props: this.svelteClientCustomElement.$$d,
    });
    // With `css: "injected"`, component styles land in `head` alongside any
    // `<svelte:head>` content. Forward only the style resources into the
    // shadow root; everything else would be invalid there.
    yield extractShadowStylesFromHead(head);
    yield body;
  }

  private reflectPropertyToAttribute(name: string, value: unknown) {
    const propDefinition = this.svelteClientCustomElement.$$p_d[name];
    if (!propDefinition?.reflect) {
      return;
    }

    // This mirrors Svelte's default observed attribute name when no explicit
    // attribute is configured for a custom-element prop.
    const attributeName = propDefinition.attribute ?? name.toLowerCase();
    const attributeValue = propValueToAttributeValue(value, propDefinition);
    if (attributeValue == null) {
      this.ssrAttributes.delete(attributeName);
      return;
    }
    this.ssrAttributes.set(attributeName, attributeValue);
  }
}
