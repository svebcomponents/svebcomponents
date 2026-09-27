import degit from "degit";
import { readdir, readFile, rename, rm } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The template bundled as `library`, as a degit spec pinned to a commit.
 *
 * It lives in `package.json` so every published version records which
 * template commit it bundles. Pinned rather than fetched from `main` so a
 * template change shows up as a diff; Renovate bumps it when the template's
 * `main` moves (see `renovate.json`).
 */
const { templateSource } = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
) as { templateSource: string };

if (!/^[\w.-]+\/[\w.-]+#[0-9a-f]{40}$/.test(templateSource)) {
  throw new Error(
    `package.json templateSource must be pinned to a full commit hash, got "${templateSource}"`,
  );
}

/**
 * npm leaves these out of published tarballs. `vp create` renames
 * `_gitignore` / `_npmrc` back, but only at the template root.
 */
const NPM_DROPPED_FILES = new Set([".gitignore", ".npmrc"]);

const dest = fileURLToPath(
  new URL("../dist/templates/library", import.meta.url),
);

await rm(dest, { recursive: true, force: true });
await degit(templateSource).clone(dest);

for (const entry of await readdir(dest, {
  recursive: true,
  withFileTypes: true,
})) {
  if (!NPM_DROPPED_FILES.has(entry.name)) continue;

  const path = join(entry.parentPath, entry.name);
  if (entry.parentPath === dest) {
    await rename(path, join(dest, `_${entry.name.slice(1)}`));
  } else {
    // npm would drop it anyway; remove it so `dist` matches the tarball
    console.warn(
      `removed ${relative(dest, path)}: npm drops it and vp create only restores dotfiles at the template root`,
    );
    await rm(path);
  }
}

console.log(`bundled ${templateSource} into ${relative(process.cwd(), dest)}`);
