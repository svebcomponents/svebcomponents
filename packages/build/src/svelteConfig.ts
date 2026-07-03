export interface SvelteBuildConfig {
  compilerOptions?: Record<string, unknown>;
  extensions?: string[];
  preprocess?: unknown;
}

const getExperimentalOptions = (
  compilerOptions: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  // Svelte 6 TODO: remove this experimental option merge once async rendering
  // is no longer configured through `compilerOptions.experimental.async`.
  const experimental = compilerOptions["experimental"];
  if (
    experimental &&
    typeof experimental === "object" &&
    !Array.isArray(experimental)
  ) {
    return experimental as Record<string, unknown>;
  }
  return undefined;
};

export const mergeCompilerOptions = (
  compilerOptions: Record<string, unknown> | undefined,
  forcedCompilerOptions: Record<string, unknown>,
) => {
  const baseCompilerOptions = compilerOptions ?? {};
  const experimentalOptions = getExperimentalOptions(baseCompilerOptions);
  const forcedExperimentalOptions = getExperimentalOptions(
    forcedCompilerOptions,
  );

  return {
    ...baseCompilerOptions,
    ...forcedCompilerOptions,
    ...(experimentalOptions || forcedExperimentalOptions
      ? {
          experimental: {
            ...experimentalOptions,
            ...forcedExperimentalOptions,
          },
        }
      : {}),
  };
};
