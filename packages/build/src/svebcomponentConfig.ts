import svelte from "rollup-plugin-svelte";
import autoOptions from "@svebcomponents/auto-options";
import { Options } from "tsdown";

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
export const createTsdownConfig = (options: SvebcomponentsOptions): Options => {
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
    dts: true,
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
    ...(externalSvelte ? { external: [/^svelte(\/.*)?$/] } : {}),
    // A hydratable component's client build imports `@svebcomponents/ssr`'s
    // HydrationHost (see auto-options' injected `import ... from
    // "@svebcomponents/ssr/hydration-host"`). That subpath ships as raw
    // `.svelte`, so leaving it external forces the runtime import to resolve
    // to an uncompiled `.svelte` — which a consuming app's SSR can only load
    // if it adds every such component to `ssr.noExternal`. Bundle it here
    // instead: it is compiled by this same (component author's) toolchain,
    // exactly like the server-side host (see `createHydrationHostTsdownConfig`),
    // so hydration markers still match by construction and consumers need no
    // `noExternal` entry for the component.
    ...(hydratable
      ? { noExternal: [/@svebcomponents\/ssr\/hydration-host/] }
      : {}),
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
  } satisfies Options;
};
