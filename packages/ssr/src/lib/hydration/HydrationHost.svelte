<!-- svebcomponents:auto-options-ignore -->
<script lang="ts">
  // The host component rendered on BOTH sides of a hydratable custom element:
  // - on the server, `SvelteCustomElementRenderer.renderShadow` renders it
  //   (compiled with generate: "server") around the user's component
  // - on the client, `hydratable`'s connectedCallback hydrates it against the
  //   declarative shadow DOM produced by the server render
  // Using the same component on both sides guarantees the markup structure
  // (hydration markers, dynamic-component anchors) matches by construction.
  import type { Component } from "svelte";

  // structural duplicates of the types in shared/propConversion.ts — importing
  // them here would make this component's compilation depend on package-
  // internal paths when consumer builds compile the shipped .svelte source
  interface PropDefinition {
    attribute?: string;
    reflect?: boolean;
    type?: "Array" | "Boolean" | "Number" | "Object" | "String";
  }
  interface ReflectingHost {
    $$svebReflect: (
      prop: string,
      value: unknown,
      propDefinition: PropDefinition,
    ) => void;
  }

  interface Props {
    __component: Component<Record<string, unknown>>;
    __host?: ReflectingHost | undefined;
    __propDefinitions?: Record<string, PropDefinition>;
    __initialProps?: Record<string, unknown>;
  }

  let {
    __component: UserComponent,
    __host = undefined,
    __propDefinitions = {},
    __initialProps = {},
  }: Props = $props();

  // Deliberately a one-time snapshot: later updates flow through setProps.
  // eslint-disable-next-line svelte/no-unused-svelte-ignore -- the warning fires in consumer builds (rollup-plugin-svelte), not in this package's lint compile
  // svelte-ignore state_referenced_locally
  const componentProps: Record<string, unknown> = $state({ ...__initialProps });

  /**
   * Applies prop updates from the custom element facade ($set), keeping the
   * spread below reactive.
   */
  export function setProps(next: Record<string, unknown>): void {
    Object.assign(componentProps, next);
  }

  // Reflect configured props back to host attributes. This replaces the
  // reflection effect svelte's SvelteElement sets up in its own (skipped)
  // connectedCallback. The conversion + re-entrancy guard live on the host
  // element (see hydratable.ts) so this component stays framework-pure.
  $effect(() => {
    if (!__host) return;
    for (const key of Object.keys(__propDefinitions)) {
      const propDefinition = __propDefinitions[key];
      if (!propDefinition?.reflect) continue;
      // reading componentProps[key] registers the dependency
      __host.$$svebReflect(key, componentProps[key], propDefinition);
    }
  });
</script>

<UserComponent {...componentProps} />
