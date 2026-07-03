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

const isPromiseLike = <T>(value: unknown): value is PromiseLike<T> =>
  typeof value === "object" &&
  value !== null &&
  "then" in value &&
  typeof value.then === "function";

type SvelteRenderResult = {
  body: string;
  head: string;
};

export interface SvelteClientCustomElement {
  new (): Omit<SvelteClientCustomElement, "new">;
  attributes: Record<string, string>;
  attributeChangedCallback: (
    name: string,
    oldValue: string | null,
    newValue: string | null,
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
    // All known callers honor the `value: string` contract: Lit's SSR
    // pipeline stringifies attribute values before calling this, and our
    // Server.svelte wrapper routes non-string values through `setProperty`.
    name = name.toLowerCase();
    this.ssrAttributes.set(name, value);
    this.svelteClientCustomElement.attributeChangedCallback(name, value, value);
  }

  /**
   * Not part of Lit's `ElementRenderer` API (which never removes attributes),
   * but mirrors the DOM's `Element.removeAttribute` so wrapper code can clear
   * an attribute that was set earlier during rendering.
   */
  removeAttribute(name: string) {
    name = name.toLowerCase();
    const oldValue = this.ssrAttributes.get(name);
    if (oldValue === undefined) {
      // Mirrors browser behavior: removing an absent attribute is a no-op
      // and does not fire attributeChangedCallback.
      return;
    }
    this.ssrAttributes.delete(name);
    this.svelteClientCustomElement.attributeChangedCallback(
      name,
      oldValue,
      null,
    );
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
    const result = render(this.svelteSsrComponent, {
      props: this.svelteClientCustomElement.$$d,
    }) as unknown as SvelteRenderResult | PromiseLike<SvelteRenderResult>;
    if (isPromiseLike<SvelteRenderResult>(result)) {
      yield Promise.resolve(result).then(({ body, head }) => [head, body]);
      return;
    }
    yield result.head;
    yield result.body;
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
