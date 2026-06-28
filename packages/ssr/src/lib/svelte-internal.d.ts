declare module "svelte/internal/server" {
  export function attr<V>(name: string, value: V, is_boolean?: boolean): string;
}
