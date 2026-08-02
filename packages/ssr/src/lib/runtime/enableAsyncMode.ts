/**
 * Enables Svelte's async server-rendering mode for this process.
 *
 * Svelte gates asynchronous SSR behind a module-global flag: when it is off,
 * `render()` renders synchronously *even when awaited*, and a component that
 * performs asynchronous work throws `await_invalid`. The flag is flipped as a
 * side effect of loading `svelte/internal/flags/async`, which vite-plugin-svelte
 * injects into a Svelte app compiled with `compilerOptions.experimental.async`.
 *
 * A non-Svelte host has no such app, and a component package's own server
 * bundle cannot flip it either — the bundle carries its own copy of Svelte,
 * while `render()` is called from the copy this package imports. So a Vue or
 * React app that renders asynchronous custom elements has to opt in
 * explicitly:
 *
 * ```ts
 * // server entry, before rendering
 * import "@svebcomponents/ssr/enable-async";
 * ```
 *
 * This is the non-Svelte counterpart to the Svelte integration's
 * `svebcomponentsSsr({ async: true })` option, and like that option it is a
 * process-wide switch rather than a per-component one.
 *
 * Svelte 6 TODO: revisit once async rendering is no longer gated behind an
 * experimental global flag.
 */
// eslint-disable-next-line svelte/no-svelte-internal -- this flag has no public API; it is the same module vite-plugin-svelte injects for an async-compiled app.
import "svelte/internal/flags/async";
