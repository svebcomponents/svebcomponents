import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
export const svebcomponentRollupConfig = (options) => {
    const { input, outDir } = options;
    return {
        input,
        output: {
            dir: options.outDir,
            format: "esm",
            sourcemap: true,
        },
        plugins: [
            resolve({
                browser: true,
                exportConditions: ["svelte"],
                extensions: [".svelte"],
            }),
            svelte(),
            typescript({
                outDir,
            }),
        ],
    };
};
//# sourceMappingURL=svebcomponentRollupConfig.js.map