import { DEV } from "esm-env";
import { hydrate, unmount, type Component } from "svelte";

import {
  attributeValueToPropValue,
  propValueToAttributeValue,
  SvelteCustomElementPropType,
  type SvelteCustomElementPropDefinition,
} from "../shared/propConversion.js";

/**
 * The `$$c` facade svelte's generated element class interacts with. Svelte
 * only ever calls `$set` (attribute/property changes), `$on` (event
 * plumbing) and `$destroy` (disconnect) on it.
 */
interface ComponentFacade {
  $set: (props: Record<string, unknown>) => void;
  $on: (type: string, callback: EventListener) => () => void;
  $destroy: () => void;
}

/**
 * The contract of svelte's compiler-generated custom element class
 * (`SvelteElement` in svelte/internal). These are the same internals the SSR
 * renderer already relies on (see svelteCustomElementRenderer.ts).
 */
interface SvelteGeneratedElement extends HTMLElement {
  /** the svelte component constructor */
  $$ctor: unknown;
  /** slot names the component declares */
  $$s: string[];
  /** component props data */
  $$d: Record<string, unknown>;
  /** prop definition metadata */
  $$p_d: Record<string, SvelteCustomElementPropDefinition>;
  /** the component facade (created on connect) */
  $$c: ComponentFacade | undefined;
  /** whether the element is currently connected */
  $$cn: boolean;
  /** re-entrancy guard while reflecting props to attributes */
  $$r: boolean;
  /** teardown for the attribute-reflection effect */
  $$me: () => void;
  /** listeners registered before the component existed */
  $$l: Record<string, EventListener[]>;
  /** listener unsubscribe functions */
  $$l_u: Map<EventListener, () => void>;
  connectedCallback?(): Promise<void> | void;
  attributeChangedCallback?(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void;
}

type SvelteGeneratedElementConstructor = new () => SvelteGeneratedElement;

/** maps an observed attribute name back to its prop name (svelte's `$$g_p`) */
const attributeToPropName = (
  attributeName: string,
  propDefinitions: Record<string, SvelteCustomElementPropDefinition>,
): string =>
  Object.keys(propDefinitions).find(
    (key) =>
      propDefinitions[key]?.attribute === attributeName ||
      (!propDefinitions[key]?.attribute && key.toLowerCase() === attributeName),
  ) ?? attributeName;

/**
 * Extends svelte's compiler-generated custom element class (via the official
 * `customElement.extend` option) so that a declaratively server-rendered
 * shadow root is *hydrated* instead of being wiped and re-rendered.
 *
 * Design constraints this deliberately honors:
 * - only public svelte APIs (`hydrate`, `unmount`) and the same `$$`
 *   element contract the SSR renderer already depends on
 * - anything non-hydratable (no declarative shadow root, slotted components,
 *   reconnection after teardown) falls back to `super.connectedCallback()`,
 *   i.e. svelte's untouched mount path
 * - svelte's own `hydrate()` recovers from mismatches by re-mounting, so a
 *   failed hydration degrades to exactly the previous behavior
 *
 * The client-compiled HydrationHost is passed in (auto-options injects both
 * imports into the component) instead of being imported here: importing the
 * .svelte from this module would let auto-options re-process the host and
 * create a circular import back into this module.
 */
interface HydrationHostExports {
  setProps: (next: Record<string, unknown>) => void;
}

export const hydratable = <T extends CustomElementConstructor>(
  ElementClass: T,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- host props are internal plumbing
  HydrationHost: Component<any, HydrationHostExports>,
): T => {
  const Class = ElementClass as unknown as SvelteGeneratedElementConstructor;

  const HydratableElement = class extends Class {
    // Both properties are assigned from attachShadow, which SvelteElement's
    // constructor calls via `super()` — *before* subclass field initializers
    // (or native #private field installation) run. They must therefore be
    // plain, initializer-less `declare`d properties: a class field would
    // either throw (native #private) or be reset to its initializer value
    // right after `super()` returns.
    /** the declarative shadow root claimed before svelte could clear it */
    declare private $$svebClaimedSsrShadowRoot: ShadowRoot | undefined;
    /** set once this element has client-rendered (hydrated or mounted) */
    declare private $$svebHasClientRendered: boolean | undefined;

    override attachShadow(init: ShadowRootInit): ShadowRoot {
      // SvelteElement's constructor calls `this.attachShadow(...)`; per spec
      // that would clear a declarative shadow root's children. Since this is
      // a prototype method it dispatches here even during the super
      // constructor, letting us claim the server-rendered root intact.
      const existing = this.shadowRoot;
      if (existing && existing.mode === init.mode) {
        this.$$svebClaimedSsrShadowRoot = existing;
        return existing;
      }
      return super.attachShadow(init);
    }

    /**
     * Svelte's generated `attributeChangedCallback` runs the incoming value
     * through its own attribute-to-prop conversion, which `JSON.parse`s
     * `Object`/`Array` typed attributes without guarding. A malformed value
     * therefore throws out of a custom-element reaction — surfacing as a
     * page-level unhandled error, having skipped the update anyway.
     *
     * Only that conversion is swallowed. Any other error is a real one (a
     * component's own update, say) and keeps propagating, so this cannot hide
     * a genuine failure behind a silent no-op.
     *
     * Svelte 6 TODO (#8): delete this override, and the matching try/catch in
     * the attribute-porting loop below, once svelte's own conversion stops
     * throwing on an unparseable `Object`/`Array` attribute. Not filed
     * upstream yet — worth filing independently of svelte 6.
     */
    override attributeChangedCallback(
      name: string,
      oldValue: string | null,
      newValue: string | null,
    ): void {
      try {
        super.attributeChangedCallback?.(name, oldValue, newValue);
      } catch (error) {
        const type = this.$$p_d[attributeToPropName(name, this.$$p_d)]?.type;
        if (
          type !== SvelteCustomElementPropType.Array &&
          type !== SvelteCustomElementPropType.Object
        ) {
          throw error;
        }
        if (DEV) {
          console.warn(
            `[svebcomponents] <${this.tagName.toLowerCase()}>: ignoring unparseable value for attribute "${name}"`,
          );
        }
      }
    }

    /**
     * Reclaims a declarative shadow root the HTML parser was unable to attach.
     *
     * The parser only honours `<template shadowrootmode>` when the host has no
     * shadow root yet. Whenever the element's definition has *already* loaded
     * by the time its markup is parsed, the element upgrades on its start tag
     * and `SvelteElement`'s constructor calls `attachShadow` before the
     * template is even read — so the parser refuses it and leaves it in the
     * light DOM as an inert `<template>` element.
     *
     * That ordering occurs whenever a host parses serialized markup after the
     * definition has loaded. React's streamed Suspense content is one example:
     * it arrives in a `<div hidden>` after the component bundle has run, so the
     * element upgrades before the parser reaches its template.
     *
     * Adopting the template by hand restores server-rendered hydration for
     * those elements. Removing it matters just as much: it is a light-DOM
     * child no host framework rendered, and React treats the extra node as a
     * hydration mismatch and re-creates the entire subtree.
     */
    private $$svebAdoptStrandedTemplate(): ShadowRoot | undefined {
      const root = this.shadowRoot;
      // a populated root was claimed from the parser already; a missing one
      // means this element does not use shadow DOM at all
      if (!root || root.childNodes.length > 0) return undefined;

      const template = this.firstElementChild;
      // Only recover the declarative root this class would have received from
      // the parser. A mismatched or invalid mode is user light DOM, not our
      // stranded SSR template; consuming it would silently change both its
      // tree ownership and encapsulation semantics.
      if (
        !(template instanceof HTMLTemplateElement) ||
        template.getAttribute("shadowrootmode") !== root.mode
      ) {
        return undefined;
      }

      root.append(template.content);
      template.remove();
      return root;
    }

    override async connectedCallback(): Promise<void> {
      if (this.$$svebClaimedSsrShadowRoot === undefined) {
        // Markup inserted through `innerHTML` never attaches a declarative
        // shadow root either, and there the children are already in place, so
        // this costs nothing and resolves that case immediately.
        let adopted = this.$$svebAdoptStrandedTemplate();

        if (adopted === undefined && document.readyState === "loading") {
          // The parser runs an element's upgrade reactions on its *start* tag
          // and appends the children afterwards, so a stranded template is not
          // observable yet. Yielding a task lets the parser get past the
          // element's end tag first.
          //
          // Gated on the document still parsing so this never delays an
          // element created after load, and it is only reached at all by
          // elements with no server-rendered shadow content — the ones about
          // to client-render regardless.
          await new Promise((resolve) => {
            setTimeout(resolve, 0);
          });

          // A host framework can move the element within that task — React
          // relocates streamed content out of the `<div hidden>` it was parsed
          // in, which disconnects and reconnects it — and the reconnect runs
          // this callback again. Bailing out leaves that second run to do the
          // work, rather than mounting an element no longer in the document.
          if (!this.isConnected) return;

          adopted = this.$$svebAdoptStrandedTemplate();
        }

        this.$$svebClaimedSsrShadowRoot = adopted;
      }

      const ssrRoot = this.$$svebClaimedSsrShadowRoot;
      const canHydrate =
        ssrRoot !== undefined &&
        ssrRoot.childNodes.length > 0 &&
        !this.$$svebHasClientRendered &&
        !this.$$c &&
        // slotted components need hydration-aware slot handling we don't
        // provide yet — fall back to svelte's mount path for them
        this.$$s.length === 0;

      if (!canHydrate) {
        if (
          ssrRoot !== undefined &&
          ssrRoot.childNodes.length > 0 &&
          !this.$$svebHasClientRendered &&
          !this.$$c
        ) {
          if (DEV && this.$$s.length > 0) {
            // surfaced so nobody mistakes the deliberate fallback for broken
            // hydration — see the hydration docs' slot caveat
            console.info(
              `[svebcomponents] <${this.tagName.toLowerCase()}> declares slots and was mounted instead of hydrated. ` +
                "Slot hydration is expected to become possible with Svelte 6; until then, slotted components re-render on upgrade. " +
                "See https://svebcomponents.dev/server-rendering/hydration/#limitations",
            );
          }
          // non-hydratable SSR content: clear it so svelte's mount path
          // doesn't render *after* the server content
          ssrRoot.replaceChildren();
        }
        return super.connectedCallback?.();
      }

      // From here on this mirrors SvelteElement.connectedCallback, minus slot
      // creation (excluded above) and with `hydrate` instead of mount.
      this.$$cn = true;
      // parity with svelte: give light-DOM children a tick to settle
      await Promise.resolve();
      if (!this.$$cn || this.$$c) {
        return;
      }

      // port host attributes to props
      for (const attribute of this.attributes) {
        const name = attributeToPropName(attribute.name, this.$$p_d);
        if (!(name in this.$$d)) {
          if (!this.$$p_d[name]) {
            this.$$d[name] = attribute.value;
            continue;
          }
          try {
            this.$$d[name] = attributeValueToPropValue(
              attribute.value,
              this.$$p_d[name],
            );
          } catch {
            // malformed typed attribute (e.g. invalid JSON): skip the prop
            // rather than let the throw escape this async callback as an
            // unhandled rejection. There is no recovery from that — the
            // element is left permanently inert, its server content still on
            // screen and looking correct while it never hydrates, never
            // mounts, ignores later attribute writes and dispatches nothing.
            // The override above covers the live attribute-write half of the
            // same svelte gap.
            if (DEV) {
              console.warn(
                `[svebcomponents] <${this.tagName.toLowerCase()}>: skipping unparseable value for prop "${name}"`,
              );
            }
          }
        }
      }
      // port rich props the server serialized into the shadow DOM: host
      // frameworks re-supply them only after their own (async) hydration,
      // which would be too late — hydrating without them would mismatch the
      // server markup
      //
      // the server renderer appends its payload as the *last* child of the
      // shadow root, so only the last matching script is genuine. Anything
      // earlier is page-controlled markup (e.g. from {@html ...} content)
      // and must not be able to forge server-serialized props.
      const serializedPropsScripts = ssrRoot.querySelectorAll(
        'script[type="application/json"][data-svebcomponents-ssr-props]',
      );
      const serializedProps =
        serializedPropsScripts[serializedPropsScripts.length - 1];
      if (serializedProps) {
        try {
          const richProps = JSON.parse(
            serializedProps.textContent ?? "",
          ) as Record<string, unknown> | null;
          for (const [key, value] of Object.entries(richProps ?? {})) {
            if (!(key in this.$$d)) {
              this.$$d[key] = value;
            }
          }
        } catch {
          // malformed payload: hydrate without it (worst case: re-mount)
        }
        // remove every match so stale/forged payloads can't linger or be
        // picked up by other upgrade paths
        for (const script of serializedPropsScripts) script.remove();
      }
      // port properties set programmatically before the element upgraded
      for (const key in this.$$p_d) {
        const preUpgradeValue = (this as Record<string, unknown>)[key];
        if (!(key in this.$$d) && preUpgradeValue !== undefined) {
          this.$$d[key] = preUpgradeValue;
          delete (this as Record<string, unknown>)[key];
        }
      }

      const instance = hydrate(HydrationHost, {
        target: ssrRoot,
        props: {
          __component: this.$$ctor,
          __host: this,
          __propDefinitions: this.$$p_d,
          __initialProps: { ...this.$$d },
        },
      });
      this.$$svebHasClientRendered = true;
      // attribute reflection runs inside HydrationHost's $effect and is torn
      // down by unmount, so there is no separate reflection root to clean up
      this.$$me = () => {};
      this.$$c = {
        $set: (props) => {
          instance.setProps(props);
        },
        // Legacy `createEventDispatcher` events are not forwarded through the
        // hydration host (yet). Events dispatched via `$host()` bubble
        // natively and are unaffected.
        $on: () => () => {},
        $destroy: () => {
          unmount(instance);
        },
      };
      // wire listeners that were registered before the component existed
      for (const type in this.$$l) {
        for (const listener of this.$$l[type] ?? []) {
          const unsubscribe = this.$$c.$on(type, listener);
          this.$$l_u.set(listener, unsubscribe);
        }
      }
    }

    /**
     * Reflects a prop value back to a host attribute. Called from
     * HydrationHost's reflection $effect; conversion and the `$$r`
     * re-entrancy guard (which stops attributeChangedCallback from looping)
     * live here so the host component stays framework-pure.
     */
    $$svebReflect(
      prop: string,
      value: unknown,
      propDefinition: SvelteCustomElementPropDefinition,
    ): void {
      this.$$r = true;
      this.$$d[prop] = value;
      const attributeName = propDefinition.attribute ?? prop.toLowerCase();
      const attributeValue = propValueToAttributeValue(value, propDefinition);
      if (attributeValue == null) {
        this.removeAttribute(attributeName);
      } else if (this.getAttribute(attributeName) !== attributeValue) {
        this.setAttribute(attributeName, attributeValue);
      }
      this.$$r = false;
    }
  };

  return HydratableElement as unknown as T;
};
