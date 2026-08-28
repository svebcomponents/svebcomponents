/**
 * Next has no single "server entry", so the component package's browser entry
 * (which calls `customElements.define`) and its renderer entry (which registers
 * the `ElementRenderer`) are loaded here, once per server process.
 *
 * Both land on `globalThis` — the shim installs `customElements` with `??=`,
 * and the renderer registry lives under `Symbol.for("ElementRendererRegistry")`
 * — so the react-server and SSR module graphs, which get separate copies of
 * every module, still share one registration.
 */
export async function register(): Promise<void> {
  await import("@svebcomponents/e2e.ssr");
  await import("@svebcomponents/e2e.ssr/ssr");
  await import("@svebcomponents/e2e.ssr/sync");
  await import("@svebcomponents/e2e.ssr/sync/ssr");
}
