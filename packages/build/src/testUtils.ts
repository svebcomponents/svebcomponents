import { readdirSync, existsSync } from "fs";
import { join } from "path";

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
    .filter(dirent => dirent.isDirectory())
    .map(dirent => ({
      name: dirent.name,
      path: join(fixturesDir, dirent.name),
    }));
};