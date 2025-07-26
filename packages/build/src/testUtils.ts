import { readdirSync, existsSync } from "fs";
import { readFile } from "fs/promises";
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
}

export const getTestFixtures = (): TestFixture[] => {
  const fixturesDir = join(import.meta.dirname, "fixtures");

  if (!existsSync(fixturesDir)) {
    return [];
  }

  return readdirSync(fixturesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => ({
      name: dirent.name,
      path: join(fixturesDir, dirent.name),
    }));
};

export const getFixtureExpectations = async (
  fixturePath: string,
): Promise<FixtureExpectations> => {
  const expectedPath = join(fixturePath, "expected.json");
  const content = await readFile(expectedPath, "utf-8");
  return JSON.parse(content) as FixtureExpectations;
};

export const getFixture = (fixtureName: string): TestFixture | undefined => {
  return getTestFixtures().find((fixture) => fixture.name === fixtureName);
};
