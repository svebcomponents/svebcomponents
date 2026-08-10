import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import type { MarkdownHeading } from "astro";

/**
 * The `packages/*` and `changelog/*` pages are thin wrappers that import a
 * markdown file from the monorepo. Starlight builds its table of contents from
 * headings found in the page file itself, and headings inside an imported
 * component never reach it — so those pages would otherwise ship an empty
 * "On this page".
 *
 * Astro exposes `getHeadings()` on every imported markdown module, so we can
 * read the real headings here and rebuild the table of contents from them.
 */
const markdownSources = import.meta.glob<{
  getHeadings: () => MarkdownHeading[];
}>("../../../packages/*/{README,CHANGELOG}.md", { eager: true });

interface TocItem extends MarkdownHeading {
  children: TocItem[];
}

/** Mirrors Starlight's own anchor for the page title entry. */
const PAGE_TITLE_ID = "_top";

const sourceFor = (id: string) => {
  const [group, name] = id.split("/");
  if (!name) return undefined;
  const file =
    group === "packages"
      ? "README"
      : group === "changelog"
        ? "CHANGELOG"
        : undefined;
  if (!file) return undefined;
  return markdownSources[`../../../packages/${name}/${file}.md`];
};

/** Nest a flat heading list, deepest-last, the way Starlight does. */
const nest = (headings: MarkdownHeading[], title: string): TocItem[] => {
  const toc: TocItem[] = [
    { depth: 2, slug: PAGE_TITLE_ID, text: title, children: [] },
  ];
  const inject = (items: TocItem[], item: TocItem): void => {
    const last = items.at(-1);
    if (!last || last.depth >= item.depth) {
      items.push(item);
      return;
    }
    inject(last.children, item);
  };
  for (const heading of headings) inject(toc, { ...heading, children: [] });
  return toc;
};

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  const source = sourceFor(route.id);
  if (!source || !route.toc) return;

  // Changelogs nest "Minor Changes"/"Patch Changes" under every release; only
  // the version headings are worth listing.
  if (route.id.startsWith("changelog/")) route.toc.maxHeadingLevel = 2;

  const headings = source
    .getHeadings()
    .filter(
      ({ depth }) =>
        depth >= route.toc!.minHeadingLevel &&
        depth <= route.toc!.maxHeadingLevel,
    );
  if (headings.length === 0) return;

  route.headings = headings;
  route.toc.items = nest(headings, route.entry.data.title);
});
