interface RollupConfigSvebcomponentsOptions {
    /**
     * The entrypoint for the svelte component that is being transformed.
     */
    input: string;
    /**
     * The file rollup should write the output to.
     */
    outDir: string;
}
export declare const svebcomponentRollupConfig: (options: RollupConfigSvebcomponentsOptions) => {
    input: string;
    output: {
        dir: string;
        format: "esm";
        sourcemap: true;
    };
    plugins: import("rollup").Plugin<any>[];
};
export {};
//# sourceMappingURL=svebcomponentRollupConfig.d.ts.map