import {
  ElementRenderer,
  type RenderInfo,
  type RenderResult,
} from "@lit-labs/ssr";

import { renderSsrAttribute } from "./html.js";

// ---- Vue type declarations (no hard runtime import) ----------------------
//
// The consumer already has Vue installed (they're building Vue web
// components). We declare only what we need so there's no mandatory
// peer-dep at the package level for the renderer itself.

/**
 * Shape of a Vue component compiled for SSR.
 *
 * @vue/compiler-sfc with `{ ssr: true }` adds a synchronous `ssrRender`
 * function alongside the normal component options. That function is what
 * we call directly to avoid Vue's async `renderToString` wrapper.
 */
export interface VueSsrComponent {
  ssrRender?: (
    ctx: unknown,
    push: (chunk: string) => void,
    parent: unknown,
    attrs: Record<string, unknown>,
  ) => void;
  setup?: (
    props: Record<string, unknown>,
    ctx: VueSetupContext,
  ) => Record<string, unknown> | void;
  props?: VuePropsDefinition;
  /** CSS strings attached by defineCustomElement or the SFC compiler. */
  styles?: string[];
  __scopeId?: string;
}

interface VueSetupContext {
  emit: () => void;
  expose: (exposed: Record<string, unknown>) => void;
  attrs: Record<string, unknown>;
  slots: Record<string, unknown>;
}

type PropConstructor =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | ObjectConstructor
  | ArrayConstructor
  | FunctionConstructor;

interface VuePropOption {
  type?: PropConstructor | PropConstructor[];
  default?: unknown;
  required?: boolean;
  /** Vue 3.5+: reflect the prop back to a host attribute. */
  reflect?: boolean;
}

type VuePropsDefinition =
  | string[]
  | Record<
      string,
      PropConstructor | PropConstructor[] | VuePropOption | null
    >;

/**
 * A Vue custom element class produced by `defineCustomElement`.
 * The static `_def` property holds the raw component options.
 */
export interface VueCustomElementClass {
  new (): unknown;
  _def: VueSsrComponent;
  observedAttributes?: string[];
}

// ---- Internal helpers ----------------------------------------------------

function camelize(str: string): string {
  return str.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

function normalizeProps(
  props: VueSsrComponent["props"],
): Record<string, VuePropOption> {
  if (!props) return {};
  if (Array.isArray(props)) {
    return Object.fromEntries(props.map((p) => [p, {}]));
  }
  const result: Record<string, VuePropOption> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined) {
      result[key] = {};
    } else if (typeof value === "function") {
      result[key] = { type: value as PropConstructor };
    } else if (Array.isArray(value)) {
      result[key] = { type: value as PropConstructor[] };
    } else {
      result[key] = value as VuePropOption;
    }
  }
  return result;
}

function coerceAttr(value: string, propOpt: VuePropOption): unknown {
  const type = propOpt.type;
  if (!type) return value;
  const types = Array.isArray(type) ? type : [type];
  if (types.includes(Number)) {
    const n = Number(value);
    if (!isNaN(n)) return n;
  }
  if (types.includes(Boolean)) {
    if (value === "" || value === "true") return true;
    if (value === "false") return false;
  }
  return value;
}

/**
 * Build the SSR context object from merged props + setup return values.
 *
 * Vue's public-instance proxy auto-unwraps `Ref` / `ComputedRef` objects
 * (they carry `__v_isRef: true`). We replicate that with a plain Proxy so
 * we never need to import `reactive` from Vue, which keeps this file free
 * of a hard runtime dependency.
 */
function buildCtx(merged: Record<string, unknown>): Record<string, unknown> {
  return new Proxy(merged, {
    get(target, key: string) {
      const val = target[key];
      if (
        val !== null &&
        typeof val === "object" &&
        (val as { __v_isRef?: unknown }).__v_isRef === true
      ) {
        return (val as { value: unknown }).value;
      }
      return val;
    },
  });
}

const NOOP = () => {};

const MINIMAL_SETUP_CTX: VueSetupContext = {
  emit: NOOP,
  expose: NOOP,
  attrs: {},
  slots: {},
};

// ---- Renderer ------------------------------------------------------------

/**
 * ElementRenderer for Vue custom elements.
 *
 * ## How it works
 *
 * Vue's `@vue/compiler-sfc` with `{ ssr: true }` compiles SFCs to include
 * a synchronous `ssrRender(ctx, push, parent, attrs)` function. We call
 * that function directly, collecting the pushed chunks, instead of going
 * through Vue's async `renderToString` wrapper. This keeps `renderShadow`
 * a synchronous generator and lets it slot into the existing
 * `Server.svelte` rendering path without any changes.
 *
 * ## Limitations
 *
 * - The server build of the component MUST be compiled with
 *   `@vue/compiler-sfc` using `{ ssr: true }` so that `ssrRender` is
 *   present on the component object.
 * - Async `setup()` is not supported (throws at render time).
 * - `inject` / `provide` context is not available during SSR.
 * - Lifecycle hooks (`onMounted`, etc.) are not called (normal for SSR).
 * - Vue 3.5 prop reflection (`reflect: true`) is not yet implemented.
 */
export class VueCustomElementRenderer
  extends ElementRenderer
  implements ElementRenderer
{
  private readonly props: Record<string, unknown> = {};
  private readonly ssrAttributes = new Map<string, string>();
  private readonly propDefs: Record<string, VuePropOption>;
  private readonly styles: readonly string[];

  constructor(
    private readonly vueSsrComponent: VueSsrComponent,
    VueCustomElementCtor: VueCustomElementClass,
    tagName = "",
  ) {
    super(tagName);
    this.propDefs = normalizeProps(VueCustomElementCtor._def.props);
    this.styles = VueCustomElementCtor._def.styles ?? [];
  }

  override setAttribute(name: string, value: string) {
    if (typeof value !== "string") {
      // Non-string value: skip attribute serialisation and write directly
      // to props (mirrors SvelteCustomElementRenderer's behaviour).
      this.props[camelize(name)] = value;
      return;
    }
    name = name.toLowerCase();
    this.ssrAttributes.set(name, value);
    const propName = camelize(name);
    const propDef = this.propDefs[propName];
    this.props[propName] = propDef ? coerceAttr(value, propDef) : value;
  }

  override setProperty(name: string, value: unknown) {
    this.props[name] = value;
  }

  override *renderAttributes(): RenderResult {
    for (const [name, value] of this.ssrAttributes) {
      yield renderSsrAttribute(name, value);
    }
  }

  override *renderShadow(_renderInfo: RenderInfo): RenderResult | undefined {
    const { ssrRender, setup } = this.vueSsrComponent;

    if (!ssrRender) {
      throw new Error(
        `[VueCustomElementRenderer] Vue component for <${this.tagName || "?"}> ` +
          "is missing ssrRender. Ensure the server build is compiled with " +
          "@vue/compiler-sfc's { ssr: true } compiler option.",
      );
    }

    // Build the context object --------------------------------------------
    let ctx: Record<string, unknown>;

    if (setup) {
      // Pass a plain-object copy of props. For SSR we don't need
      // reactivity tracking — only the initial computed values matter.
      const setupResult = setup({ ...this.props }, MINIMAL_SETUP_CTX);

      if (setupResult instanceof Promise) {
        throw new Error(
          `[VueCustomElementRenderer] Vue component for <${this.tagName || "?"}> ` +
            "uses async setup(). Async setup() is not supported in " +
            "web component SSR.",
        );
      }

      ctx = buildCtx({
        ...this.props,
        ...(setupResult && typeof setupResult === "object" ? setupResult : {}),
      });
    } else {
      ctx = buildCtx({ ...this.props });
    }

    // Inject scoped styles ------------------------------------------------
    if (this.styles.length > 0) {
      yield `<style>${this.styles.join("\n")}</style>`;
    }

    // Call the compiled synchronous ssrRender function --------------------
    //
    // For non-async Vue components (no async setup, no Suspense), the
    // compiled ssrRender calls push() synchronously before returning.
    // Async components are explicitly rejected above.
    const chunks: string[] = [];
    ssrRender(ctx, (chunk) => chunks.push(chunk), null, {});
    yield* chunks;
  }
}
