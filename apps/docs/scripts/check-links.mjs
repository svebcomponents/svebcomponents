import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { remarkStripLeadingH1 } from "../src/plugins/remarkStripLeadingH1.js";

const docsRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/content/docs",
);
const repositoryRoot = path.resolve(docsRoot, "../../../../..");
const packagesRoot = path.join(repositoryRoot, "packages");
const siteUrl = new URL("https://svebcomponents.dev/");

// Astro owns the heading algorithm. Resolve its Markdown processor from Astro's
// dependency graph so this script cannot drift from the installed Astro version.
const requireFromAstro = createRequire(import.meta.resolve("astro"));
const { createMarkdownProcessor, parseFrontmatter } = await import(
  requireFromAstro.resolve("@astrojs/markdown-remark")
);
const markdownProcessor = await createMarkdownProcessor({
  remarkPlugins: [remarkStripLeadingH1],
  syntaxHighlight: false,
});

const walk = async (directory, extensions) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target, extensions)));
    if (
      entry.isFile() &&
      extensions.some((extension) => target.endsWith(extension))
    ) {
      files.push(target);
    }
  }

  return files;
};

const normalizeRoute = (pathname) => {
  const clean = pathname.replace(/\/index$/, "").replace(/\/+$/, "");
  return clean === "" ? "/" : `${clean}/`;
};

const routeForDoc = (file) => {
  const relative = path.relative(docsRoot, file).replace(/\\/g, "/");
  return normalizeRoute(`/${relative.replace(/\.mdx?$/, "")}`);
};

const decodeHtmlAttribute = (value) =>
  value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'");

const linksFromHtml = (html) => {
  const links = [];
  const anchor = /<a\b[^>]*\bhref=(?:"([^"]*)"|'([^']*)')[^>]*>/gi;

  for (const match of html.matchAll(anchor)) {
    links.push(decodeHtmlAttribute(match[1] ?? match[2]));
  }

  return links;
};

const linksFromFrontmatter = (frontmatter) => {
  const links = [];

  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;

    for (const [key, child] of Object.entries(value)) {
      if ((key === "href" || key === "link") && typeof child === "string") {
        links.push(child);
      } else {
        visit(child);
      }
    }
  };

  visit(frontmatter);
  return links;
};

const printedSiteUrls = (source) =>
  [...source.matchAll(/https:\/\/svebcomponents\.dev\/[^\s"'`)<]+/g)].map(
    (match) => match[0],
  );

export const analyzeMarkdown = async (source, file) => {
  const parsed = parseFrontmatter(source);
  const rendered = await markdownProcessor.render(parsed.content, {
    fileURL: file ? pathToFileURL(file) : undefined,
    frontmatter: parsed.frontmatter,
  });

  return {
    headings: new Set(rendered.metadata.headings.map(({ slug }) => slug)),
    links: new Set([
      ...linksFromHtml(rendered.code),
      ...linksFromFrontmatter(parsed.frontmatter),
      ...printedSiteUrls(source),
    ]),
  };
};

export const resolveInternalTarget = (target, route) => {
  // Repository Markdown has no site-relative context. Root paths and absolute
  // site URLs still refer to the documentation site.
  if (route === undefined && !target.startsWith("/")) {
    try {
      const absolute = new URL(target);
      return absolute.origin === siteUrl.origin ? absolute : undefined;
    } catch {
      return undefined;
    }
  }

  let url;
  try {
    url = new URL(target, new URL(route ?? "/", siteUrl));
  } catch {
    return undefined;
  }

  return url.origin === siteUrl.origin ? url : undefined;
};

const importedMarkdown = (source) =>
  [
    ...source.matchAll(
      /^\s*import\s+.+?\s+from\s+["']([^"']+\.md)["'];?\s*$/gm,
    ),
  ].map((match) => match[1]);

export const checkLinks = async () => {
  const failures = [];
  const sources = [];
  const pages = new Map();
  const routeOwners = new Map();
  const docsFiles = await walk(docsRoot, [".md", ".mdx"]);

  for (const file of docsFiles) {
    const source = await readFile(file, "utf8");
    const route = routeForDoc(file);
    const owner = routeOwners.get(route);

    if (owner) {
      failures.push(
        `${path.relative(repositoryRoot, file)} and ${path.relative(repositoryRoot, owner)} both define ${route}`,
      );
    } else {
      routeOwners.set(route, file);
    }

    const analyzed = await analyzeMarkdown(source, file);
    sources.push({ file, route, links: analyzed.links });
    const pageHeadings = pages.get(route) ?? new Set();
    for (const heading of analyzed.headings) pageHeadings.add(heading);
    pages.set(route, pageHeadings);

    for (const importedPath of importedMarkdown(source)) {
      const importedFile = path.resolve(path.dirname(file), importedPath);
      const importedSource = await readFile(importedFile, "utf8");
      const imported = await analyzeMarkdown(importedSource, importedFile);
      sources.push({ file: importedFile, route, links: imported.links });
      for (const heading of imported.headings) pageHeadings.add(heading);
    }
  }

  const rootReadme = path.join(repositoryRoot, "README.md");
  const readme = await analyzeMarkdown(
    await readFile(rootReadme, "utf8"),
    rootReadme,
  );
  sources.push({ file: rootReadme, route: undefined, links: readme.links });

  const packageSources = await walk(packagesRoot, [
    ".cjs",
    ".cts",
    ".js",
    ".jsx",
    ".json",
    ".mjs",
    ".mts",
    ".svelte",
    ".ts",
    ".tsx",
  ]);
  for (const file of packageSources) {
    const source = await readFile(file, "utf8");
    const links = new Set(printedSiteUrls(source));
    if (links.size > 0) sources.push({ file, route: undefined, links });
  }

  for (const { file, route, links } of sources) {
    for (const target of links) {
      const url = resolveInternalTarget(target, route);
      if (!url) continue;

      const targetRoute = normalizeRoute(url.pathname);
      const anchors = pages.get(targetRoute);
      const label = path.relative(repositoryRoot, file);

      if (!anchors) {
        failures.push(
          `${label}: ${target} points to missing route ${targetRoute}`,
        );
        continue;
      }

      let fragment;
      try {
        fragment = decodeURIComponent(url.hash.slice(1));
      } catch {
        failures.push(`${label}: ${target} contains an invalid URL fragment`);
        continue;
      }

      if (fragment && fragment !== "_top" && !anchors.has(fragment)) {
        failures.push(
          `${label}: ${target} points to missing heading #${fragment}`,
        );
      }
    }
  }

  return { failures, sourceCount: sources.length };
};

const main = async () => {
  const { failures, sourceCount } = await checkLinks();

  if (failures.length > 0) {
    console.error("Broken documentation links:\n");
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
  } else {
    console.log(`Checked ${sourceCount} documentation sources.`);
  }
};

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  await main();
}
