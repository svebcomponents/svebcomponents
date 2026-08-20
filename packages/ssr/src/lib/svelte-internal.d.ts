declare module "svelte/internal/server" {
  export function attr<V>(name: string, value: V, is_boolean?: boolean): string;
}

/**
 * Side-effect only: loading this module enables svelte's async mode flag.
 * See `runtime/enableAsyncMode.ts`.
 */
declare module "svelte/internal/flags/async" {}
