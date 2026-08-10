/**
 * Package READMEs and changelogs are rendered inside Starlight pages that
 * already print the page title as an `<h1>`. Without this, those pages render
 * two stacked `<h1>`s — the Starlight title and the markdown file's own.
 *
 * Docs pages carry their title in frontmatter and never open with an `<h1>`,
 * so stripping a leading one is a no-op for them.
 */
export const remarkStripLeadingH1 = () => (tree) => {
  const index = tree.children.findIndex(
    (node) => node.type !== "yaml" && node.type !== "toml",
  );
  if (index === -1) return;
  const node = tree.children[index];
  if (node.type === "heading" && node.depth === 1) {
    tree.children.splice(index, 1);
  }
};
