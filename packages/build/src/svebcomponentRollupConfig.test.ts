import { describe, test, expect, afterAll } from "vitest";
import { readFile, access, rm } from "fs/promises";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { getTestFixtures } from "./testUtils.js";

const execAsync = promisify(exec);

async function buildFixture(fixturePath: string) {
  const configPath = join(fixturePath, "rollup.config.js");
  const distDir = join(fixturePath, "dist");

  // Clean up any existing build
  await rm(distDir, { recursive: true, force: true }).catch(() => {});

  await execAsync(`npx rollup -c ${configPath}`, {
    cwd: fixturePath,
    env: { ...process.env, NODE_PATH: join(import.meta.dirname, "..") },
  });

  return distDir;
}

describe("svebcomponentRollupConfig integration tests", () => {
  const fixtures = getTestFixtures();

  afterAll(async () => {
    // Clean up after each test
    fixtures.forEach(async (fixture) => {
      const distDir = join(fixture.path, "dist");
      await rm(distDir, { recursive: true, force: true }).catch(() => {});
    });
  });

  for (const fixture of fixtures) {
    test.concurrent(
      `fixture: ${fixture.name} builds successfully and generates correct output`,
      async () => {
        const distDir = await buildFixture(fixture.path);

        const clientFiles = await Promise.all([
          access(join(distDir, "client", "index.js"))
            .then(() => true)
            .catch(() => false),
          access(join(distDir, "client", "index.d.ts"))
            .then(() => true)
            .catch(() => false),
          access(join(distDir, "client", "index.js.map"))
            .then(() => true)
            .catch(() => false),
        ]);
        expect(clientFiles).toEqual([true, true, true]);

        // Check SSR build based on fixture configuration
        if (fixture.name !== "ssr-disabled") {
          const serverFiles = await Promise.all([
            access(join(distDir, "server", "index.js"))
              .then(() => true)
              .catch(() => false),
            access(join(distDir, "server", "index.d.ts"))
              .then(() => true)
              .catch(() => false),
            access(join(distDir, "server", "index.js.map"))
              .then(() => true)
              .catch(() => false),
          ]);
          expect(serverFiles).toEqual([true, true, true]);
        } else {
          const serverExists = await access(join(distDir, "server"))
            .then(() => true)
            .catch(() => false);
          expect(serverExists).toBe(false);
        }

        // Verify JavaScript output content
        const clientOutput = await readFile(
          join(distDir, "client", "index.js"),
          "utf-8",
        );
        expect(clientOutput).toContain("create_custom_element");

        // Fixture-specific content checks
        switch (fixture.name) {
          case "basic-component":
            expect(clientOutput).toContain("my-component");
            expect(clientOutput).toContain("message");
            break;
          case "auto-options":
            expect(clientOutput).toContain("title");
            expect(clientOutput).toContain("count");
            expect(clientOutput).toContain("enabled");
            break;
          case "typescript-interfaces":
            expect(clientOutput).toContain("user-card");
            expect(clientOutput).toContain("user");
            expect(clientOutput).toContain("showEmail");
            break;
          case "ssr-disabled":
            expect(clientOutput).toContain("simple-component");
            expect(clientOutput).toContain("name");
            break;
        }

        // Verify TypeScript definitions
        const clientTypes = await readFile(
          join(distDir, "client", "index.d.ts"),
          "utf-8",
        );
        expect(clientTypes).toContain("export");

        if (fixture.name !== "ssr-disabled") {
          const serverTypes = await readFile(
            join(distDir, "server", "index.d.ts"),
            "utf-8",
          );
          expect(serverTypes).toContain("export");
        }

        // Verify source maps
        const clientSourceMap = await readFile(
          join(distDir, "client", "index.js.map"),
          "utf-8",
        );
        const sourceMapData = JSON.parse(clientSourceMap);
        expect(sourceMapData.version).toBe(3);
        expect(Array.isArray(sourceMapData.sources)).toBe(true);
        expect(Array.isArray(sourceMapData.names)).toBe(true);

        if (fixture.name !== "ssr-disabled") {
          const serverSourceMap = await readFile(
            join(distDir, "server", "index.js.map"),
            "utf-8",
          );
          const serverMapData = JSON.parse(serverSourceMap);
          expect(serverMapData.version).toBe(3);
          expect(Array.isArray(serverMapData.sources)).toBe(true);
        }
      },
    );
  }
});
