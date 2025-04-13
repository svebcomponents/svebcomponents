import type { RollupOptions } from "rollup";
interface DefineConfigOptions {
    /**
     * The entrypoint for the svelte component that is being transformed.
     */
    entry?: string;
    /**
     * Whether to generate an SSR entry file for the web component.
     */
    ssr?: boolean;
}
export declare const defineConfig: (options?: DefineConfigOptions) => RollupOptions[];
export {};
//# sourceMappingURL=index.d.ts.map