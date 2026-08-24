import { ElementRenderer, type RenderInfo } from "@lit-labs/ssr";
import type { ThunkedRenderResult } from "@lit-labs/ssr/lib/render-result.js";
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

export interface SsrPrepareContext {
  /** Snapshot of the properties that will be passed to the server component. */
  readonly props: Readonly<Record<string, unknown>>;
  /**
   * Adds or replaces a property before rendering. In hydratable builds, rich
   * values set here are serialized for the client just like host-supplied
   * properties.
   */
  setProperty(name: string, value: unknown): void;
}

/** Optional server-only preparation performed before a custom element renders. */
export type SsrPrepare = (
  context: SsrPrepareContext,
) => void | PromiseLike<void>;

/**
 * Since svelte 5.36, `render()` returns a lazily-evaluated `RenderOutput`
 * that is *always* thenable — even for fully synchronous components. Its
 * `head`/`body` getters render synchronously and throw svelte's
 * `await_invalid` error only when the component performs genuinely
 * asynchronous work. Preferring the getters keeps synchronous components
 * renderable through the sync wrapper (`collectResultSync`); only genuinely
 * async components fall back to the promise path, which requires the async
 * wrapper.
 */
const tryRenderSync = (
  result: PromiseLike<SvelteRenderResult>,
): SvelteRenderResult | undefined => {
  try {
    const { head, body } = result as unknown as SvelteRenderResult;
    if (typeof head === "string" && typeof body === "string") {
      return { head, body };
    }
    // a plain promise (no sync getters) — must be awaited
    return undefined;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("await_invalid")) {
      return undefined;
    }
    // genuine render errors must not be swallowed
    throw error;
  }
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
  private readonly svelteClientCustomElement: SvelteClientCustomElement;

  /**
   * Lit's `ElementRenderer` exposes the element instance it is rendering, and
   * its host attributes live on it. Assigning it here is what keeps this
   * renderer usable through Lit's own SSR pipeline and by host integrations
   * that read attributes the standard way (`renderer.element.attributes`, as
   * `@lit-labs/ssr-react` does) rather than through a bespoke method.
   *
   * Svelte's generated custom element class extends the SSR DOM shim's
   * `HTMLElement`, so it already *is* the element — and the shim's
   * `setAttribute` only stores the value, leaving this class free to drive
   * `attributeChangedCallback` on its own terms.
   */
  override readonly element: HTMLElement;

  constructor(
    private svelteSsrComponent: Component,
    SvelteClientCustomElementCtor: {
      new (): SvelteClientCustomElement;
    },
    tagName: string,
    /**
     * Server-compiled HydrationHost component. When provided, the shadow
     * content is rendered through it so the markup structure matches what the
     * client-side `hydratable` wrapper hydrates (same host component on both
     * sides). Omitted for non-hydratable builds, which render the component
     * directly as before.
     */
    private hydrationHostComponent?: Component,
    /**
     * Optional server-only preparation hook. A synchronous return keeps the
     * renderer synchronous; returning a promise requires an async-capable host.
     */
    private prepare?: SsrPrepare,
  ) {
    super(tagName);
    this.svelteClientCustomElement = new SvelteClientCustomElementCtor();
    this.element = this.svelteClientCustomElement as unknown as HTMLElement;
  }

  /**
   * Claims the custom element class this renderer was generated for.
   *
   * Lit's `getElementRenderer` selects a renderer by calling this, so
   * implementing it is what lets a svebcomponents renderer be passed to
   * `@lit-labs/ssr`'s `render()` in `elementRenderers`. Generated entry points
   * override it with an identity check against their own element class; the
   * base cannot know which class it serves, so it keeps Lit's default of
   * claiming nothing.
   */
  static override matchesClass(
    _ceClass: typeof HTMLElement,
    _tagName: string,
    _attributes: Map<string, string>,
  ): boolean {
    return false;
  }

  /**
   * The host attributes as name→value pairs, in insertion order.
   *
   * The SSR DOM shim exposes `attributes` as an array of `{name, value}`
   * rather than a live `NamedNodeMap`; this renderer only ever runs on the
   * server, so that is the only shape it needs to handle.
   */
  private get attributeEntries(): [string, string][] {
    return Array.from(
      this.element.attributes as unknown as ArrayLike<{
        name: string;
        value: string;
      }>,
      (attr): [string, string] => [attr.name, attr.value],
    );
  }

  override setAttribute(name: string, value: string) {
    // All known callers honor the `value: string` contract: Lit's SSR
    // pipeline stringifies attribute values before calling this, and our
    // Server.svelte wrapper routes non-string values through `setProperty`.
    name = name.toLowerCase();
    this.element.setAttribute(name, value);
    this.svelteClientCustomElement.attributeChangedCallback(name, value, value);
  }

  /**
   * Not part of Lit's `ElementRenderer` API (which never removes attributes),
   * but mirrors the DOM's `Element.removeAttribute` so wrapper code can clear
   * an attribute that was set earlier during rendering.
   */
  removeAttribute(name: string) {
    name = name.toLowerCase();
    const oldValue = this.element.getAttribute(name) ?? undefined;
    if (oldValue === undefined) {
      // Mirrors browser behavior: removing an absent attribute is a no-op
      // and does not fire attributeChangedCallback.
      return;
    }
    this.element.removeAttribute(name);
    this.svelteClientCustomElement.attributeChangedCallback(
      name,
      oldValue,
      null,
    );
  }

  override renderAttributes(): ThunkedRenderResult {
    return this.attributeEntries.map(([name, value]) =>
      renderSsrAttribute(name, value),
    );
  }

  /**
   * Names of props that arrived via `setProperty` (rich values with no
   * attribute representation). For hydratable output these are serialized
   * into the shadow DOM, because the client-side wrapper hydrates *before* a
   * host framework re-supplies them — hydrating without them would mismatch
   * the server markup and force a re-mount.
   */
  private readonly richPropNames = new Set<string>();

  override setProperty(name: string, value: unknown) {
    // defense-in-depth: a plain assignment on $$d would trigger the inherited
    // `__proto__` accessor instead of creating a data property. startRender
    // already filters these; this guards direct renderer API users too.
    if (
      name === "__proto__" ||
      name === "constructor" ||
      name === "prototype"
    ) {
      return;
    }
    this.svelteClientCustomElement.$$d[name] = value;
    this.richPropNames.add(name);
    this.reflectPropertyToAttribute(name, value);
  }

  /**
   * Serializes rich props into an inert script element appended after the
   * shadow content (outside the hydration markers, so claiming ignores it).
   * The client-side `hydratable` wrapper ports these back into `$$d` before
   * hydrating and removes the element.
   */
  private serializeRichProps(): string {
    if (!this.hydrationHostComponent || this.richPropNames.size === 0) {
      return "";
    }
    const richProps: Record<string, unknown> = {};
    for (const name of this.richPropNames) {
      richProps[name] = this.svelteClientCustomElement.$$d[name];
    }
    let json: string;
    try {
      json = JSON.stringify(richProps);
    } catch {
      // non-serializable props (functions, cycles): fall back to hydration
      // without them — worst case is svelte's recovery re-mount
      return "";
    }
    // escape `<` so `</script>` or `<!--` inside values cannot break parsing
    return `<script type="application/json" data-svebcomponents-ssr-props>${json.replaceAll("<", "\\u003C")}</script>`;
  }

  override renderShadow(renderInfo: RenderInfo): ThunkedRenderResult {
    return [
      () => {
        const preparation = this.prepare?.({
          props: Object.freeze({ ...this.svelteClientCustomElement.$$d }),
          setProperty: (name, value) => this.setProperty(name, value),
        });

        if (isPromiseLike<void>(preparation)) {
          return Promise.resolve(preparation).then(() =>
            this.renderPreparedShadow(renderInfo),
          );
        }

        return this.renderPreparedShadow(renderInfo);
      },
    ];
  }

  /** Renders after any component-specific server preparation has completed. */
  private renderPreparedShadow(_renderInfo: RenderInfo): ThunkedRenderResult {
    return [
      () => {
        const result = (this.hydrationHostComponent
          ? render(this.hydrationHostComponent, {
              props: {
                __component: this.svelteSsrComponent,
                __propDefinitions: this.svelteClientCustomElement.$$p_d,
                __initialProps: { ...this.svelteClientCustomElement.$$d },
              },
            })
          : render(this.svelteSsrComponent, {
              props: this.svelteClientCustomElement.$$d,
            })) as unknown as
          SvelteRenderResult | PromiseLike<SvelteRenderResult>;
        if (isPromiseLike<SvelteRenderResult>(result)) {
          const syncResult = tryRenderSync(result);
          if (syncResult) {
            return [
              syncResult.head,
              syncResult.body,
              this.serializeRichProps(),
            ];
          }
          return Promise.resolve(result).then(({ body, head }) => [
            head,
            body,
            this.serializeRichProps(),
          ]);
        }
        return [result.head, result.body, this.serializeRichProps()];
      },
    ];
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
      this.element.removeAttribute(attributeName);
      return;
    }
    this.element.setAttribute(attributeName, attributeValue);
  }
}
