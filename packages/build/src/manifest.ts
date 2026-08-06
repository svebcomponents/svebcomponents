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

/**
 * Finds the component sources a set of build configs covers.
 *
 * Build entries point at the module that re-exports a component
 * (`src/index.ts`), not at the `.svelte` file itself, so rather than resolving
 * each entry's import graph we search the directories the entries live in.
 * Components that declare no custom element tag are dropped by the caller, so
 * a stray internal `.svelte` file in those directories cannot leak into the
 * manifest.
 */
export const findComponentSources = async (
  cwd: string,
  tsdownOptions: UserConfig[],
): Promise<string[]> => {
  const searchRoots = new Set(
    tsdownOptions
      .flatMap((options) => entryPaths(options.entry))
      .map((entry) => path.dirname(path.resolve(cwd, entry))),
  );

  const found = new Set<string>();
  for (const root of searchRoots) {
    let entries: string[];
    try {
      entries = await fs.readdir(root, { recursive: true });
    } catch {
      // a configured entry may point outside the package (or at a path that
      // no longer exists); nothing to contribute to the manifest either way
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith(".svelte")) continue;
      found.add(path.resolve(root, entry));
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
 * Runs once per build rather than as a bundler plugin: several tsdown configs
 * (client, svelte-aware, ssr) are built in parallel for the same component, so
 * emitting from a plugin would analyze each component repeatedly and race to
 * write the same file.
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
