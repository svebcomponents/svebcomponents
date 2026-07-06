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
} from "rolldown";
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
    // The shim must be imported before anything can evaluate the client bundle
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.js"),
      expect.stringContaining("import '@svebcomponents/ssr/shim'"),
    );
    // The client bundle must be imported dynamically (chunk-order safety)
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.js"),
      expect.stringContaining(
        "const ClientSvelteComponent = (await import('../client/index.js')).default",
      ),
    );

    // The generated renderer must forward the tagName to the base renderer
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.js"),
      expect.stringContaining("constructor(tagName)"),
    );
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.js"),
      expect.stringContaining("super(ServerSvelteComponent, ctor, tagName)"),
    );

    // The generated type declaration exposes the optional tagName parameter
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.d.ts"),
      expect.stringContaining("constructor(tagName?: string)"),
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
      expect.stringContaining("await import('./custom-client.js')"),
    );
  });

  test("uses a custom entry filename when provided", async () => {
    const plugin = pluginGenerateSsrEntry({
      entryFileName: "button-ssr",
    }) as {
      writeBundle: FunctionPluginHooks["writeBundle"];
    };

    const mockContext = {
      error: vi.fn(),
    } as unknown as PluginContext;

    const outputOptions: NormalizedOutputOptions = {
      dir: "dist/server",
    } as NormalizedOutputOptions;

    plugin.writeBundle.call(mockContext, outputOptions, outputBundle);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/button-ssr.js"),
      expect.any(String),
    );
    expect(mockFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining("dist/server/button-ssr.d.ts"),
      expect.any(String),
    );
    // must not fall back to the default filename that would collide
    expect(mockFs.writeFile).not.toHaveBeenCalledWith(
      expect.stringContaining("dist/server/ssr.js"),
      expect.any(String),
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
});
