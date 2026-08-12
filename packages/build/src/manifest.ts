import fs from "node:fs/promises";
import path from "node:path";

import {
  analyzeComponent,
  type AnalyzedComponent,
  type ComponentMetadata,
  type PropMetadata,
} from "@svebcomponents/auto-options/analyze";
import type { UserConfig } from "tsdown";

/**
 * The custom elements manifest schema this generator targets.
 * @see https://github.com/webcomponents/custom-elements-manifest
 */
export const SCHEMA_VERSION = "2.1.0";

export const MANIFEST_FILE_NAME = "custom-elements.json";

export interface AnalyzedComponentFile {
  /** Package-relative, posix-separated path to the component source. */
  path: string;
  tagName: string;
  className: string;
  metadata: ComponentMetadata;
}

/**
 * Derives a class name for the manifest declaration from the element's tag.
 * The compiled custom element class is anonymous as far as the manifest is
 * concerned, but the schema keys declarations by name, so we need a stable
 * one: `my-fancy-button` becomes `MyFancyButton`.
 */
export const classNameFromTag = (tagName: string): string =>
  tagName
    .split("-")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");

const entryPaths = (entry: UserConfig["entry"]): string[] => {
  if (typeof entry === "string") return [entry];
  if (Array.isArray(entry)) return entry.filter((e) => typeof e === "string");
  if (entry && typeof entry === "object") {
    return Object.values(entry).filter((e) => typeof e === "string");
  }
  return [];
};

const IMPORT_SPECIFIER =
  /(?:from|import)\s*\(?\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;

/**
 * Resolves a relative import specifier to a file on disk, trying the
 * extensionless and `.js`-to-source rewrites TypeScript packages rely on.
 */
const resolveRelativeImport = async (
  fromFile: string,
  specifier: string,
): Promise<string | undefined> => {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = [
    base,
    // `./Component.js` in TS source usually means `./Component.ts`
    base.replace(/\.js$/, ".ts"),
    base.replace(/\.js$/, ".svelte"),
    `${base}.ts`,
    `${base}.js`,
    `${base}.svelte`,
    path.join(base, "index.ts"),
    path.join(base, "index.js"),
  ];
  for (const candidate of candidates) {
    try {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
};

/**
 * Follows an entry module's relative imports to the `.svelte` files it pulls
 * in.
 *
 * Inferred component entries point directly at `.svelte` files. Walking their
 * relative imports additionally finds nested custom elements bundled into the
 * same public entry. Ordinary TypeScript/JavaScript entries are never passed
 * here merely because they happen to import Svelte source.
 */
export const findComponentSourcesForEntry = async (
  cwd: string,
  entry: string,
): Promise<string[]> => {
  const start = path.resolve(cwd, entry);
  if (!start.endsWith(".svelte")) return [];
  const seen = new Set<string>();
  const components = new Set<string>();

  try {
    await fs.access(start);
  } catch {
    return [];
  }

  const queue = [start];

  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);

    if (file.endsWith(".svelte")) {
      components.add(file);
      // a component may itself compose other custom elements, and those are
      // part of the same entry's surface, so keep following
    }

    let code: string;
    try {
      code = await fs.readFile(file, "utf8");
    } catch {
      continue;
    }

    for (const match of code.matchAll(IMPORT_SPECIFIER)) {
      const specifier = match[1] ?? match[2];
      if (!specifier || !specifier.startsWith(".")) continue;
      const resolved = await resolveRelativeImport(file, specifier);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }

  return [...components].sort();
};

/**
 * Finds the component sources a set of build configs covers, across every
 * entry. Used for the package-wide manifest, which describes all elements
 * regardless of which entry exposes them.
 */
export const findComponentSources = async (
  cwd: string,
  tsdownOptions: UserConfig[],
): Promise<string[]> => {
  const entries = new Set(
    tsdownOptions.flatMap((options) => entryPaths(options.entry)),
  );
  const found = new Set<string>();
  for (const entry of entries) {
    for (const component of await findComponentSourcesForEntry(cwd, entry)) {
      found.add(component);
    }
  }
  return [...found].sort();
};

/**
 * Analyzes each component source, keeping only those that actually declare a
 * custom element.
 */
export const analyzeComponentFiles = async (
  cwd: string,
  files: string[],
): Promise<AnalyzedComponentFile[]> => {
  const analyzed: AnalyzedComponentFile[] = [];
  for (const file of files) {
    const code = await fs.readFile(file, "utf8");
    let analysis: AnalyzedComponent | null;
    try {
      analysis = analyzeComponent(code, file);
    } catch (error) {
      // a component that does not parse will fail the build proper with a far
      // better message than anything we could produce here; the manifest just
      // leaves it out
      console.warn(
        `[svebcomponents]: skipping ${path.relative(cwd, file)} in the custom elements manifest — it could not be parsed.`,
        error,
      );
      continue;
    }
    if (!analysis?.tagName) continue;
    analyzed.push({
      path: path.relative(cwd, file).split(path.sep).join("/"),
      tagName: analysis.tagName,
      className: classNameFromTag(analysis.tagName),
      metadata: analysis.metadata,
    });
  }
  return analyzed;
};

/**
 * The TypeScript spelling of each attribute converter svelte can apply. Used
 * when a prop carries no declared type of its own — the converter still tells
 * us what the value will be at runtime, which beats emitting `unknown`.
 */
const TS_TYPE_BY_PRIMITIVE = {
  String: "string",
  Number: "number",
  Boolean: "boolean",
  Array: "unknown[]",
  Object: "Record<string, unknown>",
} as const satisfies Record<string, string>;

/**
 * The best available TypeScript type for a prop: what the author declared,
 * falling back to the converter's type for untyped (plain JS) components.
 */
export const propTypeText = (prop: PropMetadata): string | undefined => {
  if (prop.typeText) return prop.typeText;
  if (prop.type && prop.type in TS_TYPE_BY_PRIMITIVE) {
    return TS_TYPE_BY_PRIMITIVE[prop.type as keyof typeof TS_TYPE_BY_PRIMITIVE];
  }
  return undefined;
};

const typeOf = (text: string | undefined) => (text ? { type: { text } } : {});

const describedBy = (description: string | undefined) =>
  description ? { description } : {};

/**
 * Serializes analyzed components into a custom elements manifest.
 *
 * Each component becomes one `javascript-module` carrying a single custom
 * element `class` declaration, plus the `custom-element-definition` export
 * that ties the tag to it.
 */
export const buildManifest = (components: AnalyzedComponentFile[]) => ({
  schemaVersion: SCHEMA_VERSION,
  readme: "",
  modules: components.map(
    ({ path: modulePath, tagName, className, metadata }) => {
      // property-only members (functions, snippets) have no attribute half
      const attributes = metadata.props
        .filter((prop) => !prop.propertyOnly && prop.attribute !== undefined)
        .map((prop) => ({
          name: prop.attribute as string,
          ...typeOf(propTypeText(prop)),
          ...describedBy(prop.description),
          ...(prop.default !== undefined ? { default: prop.default } : {}),
          fieldName: prop.name,
        }));

      return {
        kind: "javascript-module" as const,
        path: modulePath,
        declarations: [
          {
            kind: "class" as const,
            ...describedBy(metadata.description),
            name: className,
            tagName,
            customElement: true as const,
            members: metadata.props.map((prop) => ({
              kind: "field" as const,
              name: prop.name,
              ...typeOf(propTypeText(prop)),
              ...describedBy(prop.description),
              ...(prop.default !== undefined ? { default: prop.default } : {}),
              ...(prop.propertyOnly || prop.attribute === undefined
                ? {}
                : { attribute: prop.attribute, reflects: prop.reflects }),
              privacy: "public" as const,
            })),
            ...(attributes.length > 0 ? { attributes } : {}),
            ...(metadata.events.length > 0
              ? {
                  events: metadata.events.map((event) => ({
                    name: event.name,
                    ...typeOf(
                      event.detailTypeText
                        ? `CustomEvent<${event.detailTypeText}>`
                        : "CustomEvent",
                    ),
                    ...describedBy(event.description),
                  })),
                }
              : {}),
            ...(metadata.slots.length > 0
              ? {
                  slots: metadata.slots.map((slot) => ({
                    name: slot.name,
                    ...describedBy(slot.description),
                  })),
                }
              : {}),
            ...(metadata.cssProperties.length > 0
              ? {
                  cssProperties: metadata.cssProperties.map((property) => ({
                    name: property.name,
                    ...describedBy(property.description),
                    ...(property.default !== undefined
                      ? { default: property.default }
                      : {}),
                  })),
                }
              : {}),
          },
        ],
        exports: [
          {
            kind: "custom-element-definition" as const,
            name: tagName,
            declaration: { name: className, module: modulePath },
          },
        ],
      };
    },
  ),
});

export type CustomElementsManifest = ReturnType<typeof buildManifest>;

/**
 * Analyzes the components a build covers and writes `custom-elements.json` to
 * the package root. Returns the analyzed components so callers can reuse them
 * (the generated type declarations are built from the same data).
 *
 * Runs once per build rather than as a bundler plugin: client and server
 * configs can build the same component in parallel, so emitting from a plugin
 * would analyze each component repeatedly and race to write the same file.
 */
export const emitManifest = async (
  cwd: string,
  tsdownOptions: UserConfig[],
): Promise<AnalyzedComponentFile[]> => {
  const sources = await findComponentSources(cwd, tsdownOptions);
  const components = await analyzeComponentFiles(cwd, sources);
  if (components.length === 0) return components;

  await fs.writeFile(
    path.resolve(cwd, MANIFEST_FILE_NAME),
    `${JSON.stringify(buildManifest(components), null, 2)}\n`,
    "utf8",
  );
  return components;
};
