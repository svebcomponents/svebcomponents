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
 * while `render()` is called from the copy this package imports. So the flip
 * has to happen here. Generated `/ssr` entries call this at module scope when
 * their component package enables `experimental.async`; nothing else should
 * need to, which is why there is no separate entry point for it.
 *
 * The import is dynamic because loading that module is the flip: a static
 * import would turn async mode on for every consumer of this package.
 *
 * Like the Svelte integration's `svebcomponentsSsr({ async: true })` option,
 * this is a process-wide switch rather than a per-component one.
 *
 * Svelte 6 TODO (#8): remove this function and the generated calls to it once
 * async rendering is no longer gated behind an experimental global flag.
 * https://github.com/svebcomponents/svebcomponents/issues/8
 */
export const enableAsyncMode = async (): Promise<void> => {
  // eslint-disable-next-line svelte/no-svelte-internal -- this flag has no public API; it is the same module vite-plugin-svelte injects for an async-compiled app.
  await import("svelte/internal/flags/async");
};
