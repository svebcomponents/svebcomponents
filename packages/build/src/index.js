import svebcomponentsSsr from "@svebcomponents/ssr/rollup";
import { svebcomponentRollupConfig } from "./svebcomponentRollupConfig.js";
export const defineConfig = (options = {}) => {
    const { ssr = true, entry = "src/index.ts" } = options;
    const rollupConfig = [
        svebcomponentRollupConfig({
            input: entry,
            outDir: "dist/client",
        }),
    ];
    if (ssr) {
        rollupConfig.push(svebcomponentsSsr({
            input: entry,
            outDir: "dist/server",
        }));
    }
    return rollupConfig;
};
//# sourceMappingURL=index.js.map