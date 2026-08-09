import type { UserConfig } from "tsdown";

interface ModuleConfigOptions {
  entry: string;
  outDir: string;
  externalSvelte?: boolean;
}

/** Build an ordinary JavaScript/TypeScript package export. */
export const createModuleConfig = ({
  entry,
  outDir,
  externalSvelte = false,
}: ModuleConfigOptions): UserConfig => ({
  entry,
  outDir,
  dts: entry.endsWith(".ts"),
  fixedExtension: false,
  clean: false,
  ...(externalSvelte ? { deps: { neverBundle: [/^svelte(\/.*)?$/] } } : {}),
});
