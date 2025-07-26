import svebcomponent from "@svebcomponents/build";

export default svebcomponent({
    input: "src/index.ts",
    outDir: "dist",
    svelteOptions: {
        compilerOptions: {
            customElement: true,
        },
    },
});