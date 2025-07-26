import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { rm } from "fs/promises";

const execAsync = promisify(exec);

export async function buildFixture(fixturePath: string) {
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

export type FixtureExpectations = { [path: string]: FileExpectations };

export interface FileExpectations {
  content?: string[];
  types?: string[];
  sourcemap?: boolean;
}

export interface TestFixture {
  name: string;
  path: string;
  expectations: FixtureExpectations;
}

export const getTestFixtures = (): TestFixture[] => {
  const modules = import.meta.glob("./fixtures/**/expected.ts", {
    eager: true,
    import: "default",
  });

  const fixtures: TestFixture[] = [];
  for (const path of Object.keys(modules)) {
    // './fixtures/fixtureName/expected.ts' -> ['.', 'fixtures', 'fixtureName']
    const pathSegments = path.split("/").slice(0, -1);
    // Extract the fixture name from the path
    const fixtureName = pathSegments.at(-1);
    if (!fixtureName) continue;
    const fixtureDirPath = join(import.meta.dirname, ...pathSegments);

    fixtures.push({
      name: fixtureName,
      path: fixtureDirPath,
      expectations: modules[path] as FixtureExpectations,
    });
  }
  return fixtures;
};

export const getFixture = (fixtureName: string): TestFixture | undefined => {
  return getTestFixtures().find((fixture) => fixture.name === fixtureName);
};
