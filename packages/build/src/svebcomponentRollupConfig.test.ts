import { describe, test, expect } from "vitest";
import { readFile, access } from "fs/promises";
import { join } from "path";
import { getTestFixtures, buildFixture } from "./testUtils";

describe("svebcomponents build integration tests", () => {
  const fixtures = getTestFixtures();

  for (const fixture of fixtures) {
    test.concurrent(
      `fixture: ${fixture.name} builds successfully and generates correct output`,
      async () => {
        const expectations = fixture.expectations;
        const distDir = await buildFixture(fixture.path);

        for (const [filePath, fileExpectations] of Object.entries(
          expectations,
        )) {
          const fullPath = join(distDir, filePath);

          // Verify file exists
          await access(fullPath);

          // Verify content
          if (fileExpectations.content) {
            const content = await readFile(fullPath, "utf-8");
            for (const expected of fileExpectations.content) {
              expect(content).toContain(expected);
            }
          }

          // Verify types
          if (fileExpectations.types) {
            const types = await readFile(fullPath, "utf-8");
            for (const expected of fileExpectations.types) {
              expect(types).toContain(expected);
            }
          }

          // Verify sourcemap
          if (fileExpectations.sourcemap) {
            const sourcemapPath = fullPath + ".map";
            await access(sourcemapPath);
            const sourcemap = await readFile(sourcemapPath, "utf-8");
            const sourcemapData = JSON.parse(sourcemap);
            expect(sourcemapData.version).toBe(3);
            expect(Array.isArray(sourcemapData.sources)).toBe(true);
          }
        }
      },
    );
  }
});
