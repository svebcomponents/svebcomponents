import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

// these run against the build output — `turbo test` builds first
const root = fileURLToPath(new URL("..", import.meta.url));

type TemplateEntry = { name: string; template: string };
const { createConfig } = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as { createConfig: { templates: TemplateEntry[] } };

/** What `npm publish` would put in the tarball — what `vp create` downloads. */
const packedFiles = (
  JSON.parse(
    execFileSync("npm", ["pack", "--dry-run", "--json"], {
      cwd: root,
      encoding: "utf8",
    }),
  ) as [{ files: { path: string }[] }]
)[0].files.map((file) => file.path);

describe.each(createConfig.templates)("template $name", ({ template }) => {
  const templateDir = template.replace(/^\.\//, "");

  test("is published", () => {
    expect(packedFiles).toContain(`${templateDir}/package.json`);
  });

  test("ships root dotfiles under the names vp create restores", () => {
    expect(packedFiles).toContain(`${templateDir}/_gitignore`);
    expect(packedFiles).toContain(`${templateDir}/_npmrc`);
  });

  test("contains no dotfiles npm would drop", () => {
    const dropped = readdirSync(join(root, templateDir), { recursive: true })
      .map(String)
      .filter((path) => /(^|\/)\.(gitignore|npmrc)$/.test(path));
    expect(dropped).toEqual([]);
  });
});

test("the manifest points at existing templates", () => {
  for (const { template } of createConfig.templates) {
    expect(existsSync(join(root, template))).toBe(true);
  }
});
