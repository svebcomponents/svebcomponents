import svelte from "rollup-plugin-svelte";
import autoOptions from "@svebcomponents/auto-options";
import { UserConfig } from "tsdown";

import { pluginDedupe } from "./pluginDedupe.js";
import { pluginGuardCustomElementDefine } from "./pluginGuardCustomElementDefine.js";
import {
  mergeCompilerOptions,
  type SvelteBuildConfig,
} from "@svebcomponents/ssr/svelte-config";

interface SvebcomponentsOptions {
  /**
   * The entrypoint for the svelte component that is being transformed.
   */
  entry: string;
  /**
   * The file rollup should write the output to.
   */
  outDir: string;
  /**
   * Whether Svelte runtime imports should be left for Svelte-aware tooling to resolve.
   */
  externalSvelte?: boolean;
  /**
   * Whether to make the compiled custom element hydrate server-rendered
   * declarative shadow DOM (injects `extend: hydratable` via auto-options).
   */
  hydratable?: boolean;
  /**
   * Whether this component has an SSR build (see `defineConfig`'s `ssr`
   * option). Only then does the compiled client bundle need to defend
   * itself against being reached on the server before the DOM shim installs
   * — see the `banner` comment below. Left off (the default) for
   * browser-only components, since referencing the optional
   * `@svebcomponents/ssr` peer at all would otherwise break dev-server
   * tooling (e.g. Vite's import analysis) for consumers who never install
   * it.
   */
  installsSsrShimGuard?: boolean;
  svelteConfig?: SvelteBuildConfig | undefined;
}

// explicit return type: the inferred type references rollup's plugin types
// through non-portable .pnpm paths (TS2742) in the emitted declarations
export const createTsdownConfig = (
  options: SvebcomponentsOptions,
): UserConfig => {
  const {
    entry,
    outDir,
    externalSvelte = false,
    hydratable = false,
    installsSsrShimGuard = false,
    svelteConfig,
  } = options;
  return {
    entry,
    outDir,
    // tsdown cannot generate declarations for a raw Svelte entry. The CLI
    // writes the public component declaration from analyzer metadata instead.
    dts: !entry.endsWith(".svelte"),
    // this is a browser bundle: resolve browser export conditions (svelte's
    // root export otherwise resolves to its server entry, whose `hydrate`
    // and `mount` are unavailable-on-the-server stubs)
    platform: "browser",
    // The self-contained build (svelte bundled in) is a final-form browser
    // artifact — the CDN drop-in — so ship it minified (sourcemaps cover
    // debugging). The svelte-aware variant is compiled into the consuming
    // app's build and stays readable.
    minify: !externalSvelte,
    // Several component configs may share an output directory and are built
    // in parallel by the svebcomponents CLI; tsdown's per-build clean would
    // race and delete other builds' output. The CLI cleans once up front.
    clean: false,
    inputOptions: {
      resolve: {
        // Svelte gates its error and warning message texts — and a good deal
        // of extra bookkeeping — behind `if (DEV)`, where `DEV` comes from
        // `esm-env`. Without the `production` condition `esm-env` resolves to
        // its `dev-fallback`, which is a *runtime* `process.env.NODE_ENV`
        // check rather than a literal, so none of those branches can be
        // eliminated and the full dev-only message texts ship to the browser.
        //
        // Listed alone rather than alongside the usual `browser`/`import`
        // defaults on purpose: rolldown treats these as additive to the ones
        // `platform` already implies, and naming `browser` here would also
        // apply it to configs that are not browser builds.
        conditionNames: ["production"],
      },
      optimization: {
        // The condition alone is not enough. Rolldown emits the resolved
        // `DEV` as a module-level `var`, which the minifier will not fold
        // into its use sites, so the dead branches survive anyway. `smart`
        // mode inlines imported constants exactly where it can decide a
        // branch (`if`, ternary, `&&`/`||`/`??`) — which is the whole of
        // what `DEV` is used for.
        inlineConst: { mode: "smart", pass: 3 },
      },
    },
    // Guarantees the DOM shim installs before this module's own compiled
    // custom-element class (`class X extends HTMLElement`) evaluates,
    // regardless of *how* this module ends up reachable on the server (a
    // generated SSR entry's controlled dynamic import, or a consuming app's
    // own static import needed so the browser registers the element — the
    // latter is compiled into the server bundle too by frameworks like
    // SvelteKit, and no import-ordering convention on the consumer's side
    // can reliably beat bundler chunk hoisting). A banner is prepended as
    // raw text ahead of all bundled module code, which is a stronger
    // guarantee than relying on ESM import-order across chunks. The
    // `window` check is a plain runtime guard, not a build-time/tree-shaken
    // one, so this is only added for components with an SSR build — for a
    // browser-only component, referencing `@svebcomponents/ssr/shim` at all
    // (even unreachably) makes dev-server tooling try to resolve it, which
    // fails outright for consumers who never install that optional peer.
    ...(installsSsrShimGuard
      ? {
          banner: {
            js: `if (typeof window === 'undefined') { await import('@svebcomponents/ssr/shim'); }`,
          },
        }
      : {}),
    ...(externalSvelte || hydratable
      ? {
          deps: {
            ...(externalSvelte ? { neverBundle: [/^svelte(\/.*)?$/] } : {}),
            ...(hydratable
              ? {
                  alwaysBundle: [/@svebcomponents\/ssr\/hydration/],
                }
              : {}),
          },
        }
      : {}),
    // A hydratable component's client build imports two things from
    // `@svebcomponents/ssr` (see auto-options' injected imports): the
    // `hydratable` wrapper from "@svebcomponents/ssr/hydration", and the
    // HydrationHost from "@svebcomponents/ssr/hydration-host". Both must be
    // bundled — the regex below is a substring test, so it covers both
    // subpaths.
    //
    // The host ships as raw `.svelte`, so leaving it external forces the
    // runtime import to resolve to an uncompiled `.svelte` — which a consuming
    // app's SSR can only load if it adds every such component to
    // `ssr.noExternal`. Bundling it here is safe: it is compiled by this same
    // (component author's) toolchain, exactly like the server-side host (see
    // `createHydrationHostTsdownConfig`), so hydration markers still match by
    // construction and consumers need no `noExternal` entry.
    //
    // `hydration` is plain JS, but a component that declares
    // `@svebcomponents/ssr` as the optional *peer* dependency it is meant to
    // be gets it externalized by default — leaving a bare specifier in a
    // bundle that is otherwise self-contained. That breaks the CDN drop-in
    // outright (browsers cannot resolve bare specifiers without an import
    // map), and resolving it via an import map would be worse still: the
    // module imports `svelte`, so it would pull a *second* Svelte runtime in
    // alongside the one already bundled here.
    plugins: [
      ...(externalSvelte ? [] : [pluginDedupe(["svelte", "esm-env"])]),
      autoOptions({ hydratable }),
      svelte({
        emitCss: false,
        ...(svelteConfig?.extensions
          ? { extensions: svelteConfig.extensions }
          : {}),
        ...(svelteConfig?.preprocess
          ? { preprocess: svelteConfig.preprocess }
          : {}),
        compilerOptions: mergeCompilerOptions(svelteConfig?.compilerOptions, {
          customElement: true,
        }),
      }),
      // must run after svelte() above: it operates on the already-compiled
      // JS output, guarding Svelte's own auto-generated
      // `customElements.define(...)` call against double registration.
      pluginGuardCustomElementDefine(),
    ],
  } satisfies UserConfig;
};
