import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

const generateConfig = (type) => {
  return {
    input: "src/index.ts",
    output: {
      dir: `dist/${type}`,
      assetFileNames: "assets/[name]-[hash][extname]",
      sourcemap: true,
    },
    plugins: [
      resolve({
        browser: true,
        exportConditions: ["svelte"],
        extensions: [".svelte"],
      }),
      svelte({
        compilerOptions: {
          customElement: type === "client" ? true : false,
          generate: type,
          css: "injected",
        },
      }),
      typescript({
        outDir: `dist/${type}`,
      }),
    ],
  };
};

export default [generateConfig("client"), generateConfig("server")];
