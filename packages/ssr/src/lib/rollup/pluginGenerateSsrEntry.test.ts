import {
  expect,
  test,
  describe,
  vi,
  beforeEach,
  type MockedFunction,
} from "vitest";
import { pluginGenerateSsrEntry } from "./pluginGenerateSsrEntry";
import type {
  FunctionPluginHooks,
  NormalizedOutputOptions,
  OutputBundle,
  PluginContext,
} from "rollup";
import fs from "fs/promises";

vi.mock("fs/promises");

const mockFs = fs as unknown as {
  writeFile: MockedFunction<typeof fs.writeFile>;
};

const outputBundle: OutputBundle = {} as OutputBundle;

describe("pluginGenerateSsrEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFs.writeFile.mockResolvedValue();
  });

  test("returns plugin with correct name", () => {
    const plugin = pluginGenerateSsrEntry({});
    expect(plugin.name).toBe("svebcomponents:generate-ssr-entry");
  });

  test("generates SSR entry files with default import paths", async () => {
    const plugin = pluginGenerateSsrEntry({}) as {
      writeBundle: FunctionPluginHooks["writeBundle"];
    };
    const mockContext = {
      error: vi.fn(),
    } as unknown as PluginContext;

    const outputOptions: NormalizedOutputOptions = {
      dir: "dist/server",
    } as NormalizedOutputOptions;

    plugin.writeBundle.call(mockContext, outputOptions, outputBundle);

    expect(mockFs.writeFile).toHaveBeenCalledTimes(2);

    // Check JS file generation
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.js"),
      expect.stringContaining("import ServerSvelteComponent from './index.js'"),
    );
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.js"),
      expect.stringContaining(
        "import ClientSvelteComponent from '../client/index.js'",
      ),
    );

    // Check TypeScript declaration file generation
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.d.ts"),
      expect.any(String),
    );
  });

  test("uses custom import paths when provided", async () => {
    const plugin = pluginGenerateSsrEntry({
      serverImportPath: "./custom-server.js",
      clientImportPath: "./custom-client.js",
    }) as {
      writeBundle: FunctionPluginHooks["writeBundle"];
    };

    const mockContext = {
      error: vi.fn(),
    } as unknown as PluginContext;

    const outputOptions: NormalizedOutputOptions = {
      dir: "dist/test",
    } as NormalizedOutputOptions;

    plugin.writeBundle.call(mockContext, outputOptions, outputBundle);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(
        "import ServerSvelteComponent from './custom-server.js'",
      ),
    );
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(
        "import ClientSvelteComponent from './custom-client.js'",
      ),
    );
  });

  test("throws error when no output directory is provided", async () => {
    const plugin = pluginGenerateSsrEntry({}) as {
      writeBundle: FunctionPluginHooks["writeBundle"];
    };
    const mockContext = {
      error: (e: string) => {
        throw e;
      },
    } as PluginContext;

    const outputOptions: NormalizedOutputOptions =
      {} as NormalizedOutputOptions;

    await expect(async () =>
      plugin.writeBundle.call(mockContext, outputOptions, outputBundle),
    ).rejects.toThrowError(
      "generateSsrEntryPlugin requires an output directory (outputOptions.dir)",
    );
  });

  test("handles file write errors gracefully", async () => {
    const writeError = new Error("File write failed");
    mockFs.writeFile.mockRejectedValue(writeError);

    const plugin = pluginGenerateSsrEntry({}) as {
      writeBundle: FunctionPluginHooks["writeBundle"];
    };
    const mockContext = {
      error: (e: string) => {
        throw e;
      },
    } as PluginContext;

    const outputOptions: NormalizedOutputOptions = {
      dir: "dist/server",
    } as NormalizedOutputOptions;

    await expect(async () =>
      plugin.writeBundle.call(mockContext, outputOptions, outputBundle),
    ).rejects.toThrowError(
      "Failed to generate SSR entry file: File write failed",
    );
  });

  test("generates correct file content structure", async () => {
    const plugin = pluginGenerateSsrEntry({}) as {
      writeBundle: FunctionPluginHooks["writeBundle"];
    };
    const mockContext = {
      error: vi.fn(),
    } as unknown as PluginContext;

    const outputOptions: NormalizedOutputOptions = {
      dir: "dist/server",
    } as NormalizedOutputOptions;

    plugin.writeBundle.call(mockContext, outputOptions, outputBundle);

    const jsFileCall = mockFs.writeFile.mock.calls.find((call) =>
      call[0].toString().endsWith("ssr.js"),
    );
    const jsContent = jsFileCall?.[1] as string;

    expect(jsContent).toContain("import { SvelteCustomElementRenderer }");
    expect(jsContent).toContain(
      "class ComponentSpecificSvelteCustomElementRenderer",
    );
    expect(jsContent).toContain("extends SvelteCustomElementRenderer");
    expect(jsContent).toContain(
      "export default ComponentSpecificSvelteCustomElementRenderer",
    );

    const dtsFileCall = mockFs.writeFile.mock.calls.find((call) =>
      call[0].toString().endsWith("ssr.d.ts"),
    );
    const dtsContent = dtsFileCall?.[1] as string;

    expect(dtsContent).toContain(
      "declare class ComponentSpecificSvelteCustomElementRenderer",
    );
    expect(dtsContent).toContain(
      "export default ComponentSpecificSvelteCustomElementRenderer",
    );
  });
});

