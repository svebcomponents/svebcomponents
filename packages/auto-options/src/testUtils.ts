const isStringModule = (module: unknown): module is { default: string } => {
  return (
    typeof module === "object" &&
    module !== null &&
    "default" in module &&
    typeof module.default === "string"
  );
};

export const getTestCases = async () => {
  const inputs = import.meta.glob("./fixtures/*/input.svelte", {
    query: "?raw",
  });
  const outputs = import.meta.glob("./fixtures/*/output.svelte", {
    query: "?raw",
  });
  const matchedInputsAndOutputs = await Promise.all(
    Object.entries(inputs).map(async ([key, resolvedInput]) => {
      const name = key.split("/").at(-2);
      const input = await resolvedInput();
      const output = await outputs[key.replace("input", "output")]?.();
      if (!isStringModule(input) || !isStringModule(output) || !name) {
        throw new Error("Failed to resolve test cases");
      }
      return {
        name,
        input: input.default,
        output: output.default,
      };
    }),
  );
  return matchedInputsAndOutputs;
};
