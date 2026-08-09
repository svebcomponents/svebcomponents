import fs from "node:fs/promises";
import path from "node:path";

import type { UserConfig } from "tsdown";

import {
  emitManifest,
  findComponentSourcesForEntry,
  propTypeText,
  MANIFEST_FILE_NAME,
  type AnalyzedComponentFile,
} from "./manifest.js";

/**
 * Properties every `HTMLElement` already declares. A component prop sharing
 * one of these names shadows it, so the built-in is omitted from the element
 * interface rather than clashing with it.
 */
const HTML_ELEMENT_PROPERTIES = new Set([
  "accessKey",
  "autofocus",
  "className",
  "contentEditable",
  "dir",
  "draggable",
  "hidden",
  "id",
  "inert",
  "innerHTML",
  "innerText",
  "lang",
  "nonce",
  "outerHTML",
  "outerText",
  "part",
  "popover",
  "role",
  "slot",
  "spellcheck",
  "style",
  "tabIndex",
  "textContent",
  "title",
  "translate",
]);

export const DECLARATION_FILE_NAME = "custom-elements.d.ts";

/**
 * Rewrites references to a component's locally declared types so several
 * components can contribute to one declaration file without colliding.
 *
 * A type declared inside `Button.svelte` is file-scoped in the source but
 * module-scoped once inlined here, so `Detail` becomes `Button$Detail`. Only
 * whole-word matches of names we actually inlined are rewritten.
 */
const qualifyLocalTypes = (
  text: string,
  localTypeNames: Set<string>,
  prefix: string,
): string => {
  let result = text;
  for (const name of localTypeNames) {
    result = result.replace(
      new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"),
      `${prefix}$${name}`,
    );
  }
  return result;
};

/**
 * Rewrites a relative import specifier so it still resolves from the
 * declaration file's location. Bare specifiers ("svelte") are left alone.
 */
const rewriteSpecifier = (
  statement: string,
  source: string,
  componentDir: string,
  outputDir: string,
): string => {
  if (!source.startsWith(".")) return statement;
  const resolved = path.resolve(componentDir, source);
  const relative = path.relative(outputDir, resolved).split(path.sep).join("/");
  const specifier = relative.startsWith(".") ? relative : `./${relative}`;
  return statement.replace(source, specifier);
};

/**
 * Removes the indentation a declaration carried inside the component's script
 * block, so inlined types sit flush at the top level of the emitted file.
 * The first line is already flush (the slice starts at the declaration), so
 * the common indent is measured across the remaining lines.
 */
const dedent = (text: string): string => {
  const [first, ...rest] = text.split("\n");
  if (rest.length === 0) return text;
  const indents = rest
    .filter((line) => line.trim().length > 0)
    .map((line) => /^\s*/.exec(line)?.[0].length ?? 0);
  const common = indents.length > 0 ? Math.min(...indents) : 0;
  return [first, ...rest.map((line) => line.slice(common))].join("\n");
};

const jsDocBlock = (
  description: string | undefined,
  indent: string,
): string => {
  if (!description) return "";
  const lines = description.split("\n");
  if (lines.length === 1) return `${indent}/** ${lines[0]} */\n`;
  return `${indent}/**\n${lines
    .map((line) => `${indent} * ${line}`)
    .join("\n")}\n${indent} */\n`;
};

interface ComponentDeclaration {
  tagName: string;
  className: string;
  /** Inlined local type declarations, already prefixed. */
  preamble: string[];
  /** Import statements this component's types need. */
  imports: string[];
  /** Property signatures for the DOM element interface. */
  properties: string[];
  /** Built-in DOM properties this component's props shadow. */
  shadowedProperties: string[];
  /**
   * Template-facing members, kept structured so each augmentation can render
   * them at its own nesting depth.
   */
  templateMembers: { name: string; type: string; description?: string }[];
  eventMap: { name: string; detail: string; description?: string }[];
  description: string | undefined;
}

const buildComponentDeclaration = (
  component: AnalyzedComponentFile,
  outputDir: string,
  packageRoot: string,
): ComponentDeclaration => {
  const { tagName, className, metadata } = component;
  const componentDir = path.dirname(path.resolve(packageRoot, component.path));
  const localTypeNames = new Set(metadata.localTypes.map((type) => type.name));
  const qualify = (text: string) =>
    qualifyLocalTypes(text, localTypeNames, className);

  // Only inline the local types the emitted signatures actually reach, so an
  // internal helper (most often the `Props` interface itself, which no emitted
  // signature names) stays out of the public declarations. Reachability is
  // followed to a fixpoint: an inlined type may in turn reference another.
  const surfaceText = [
    ...metadata.props.map((prop) => prop.typeText ?? ""),
    ...metadata.events.map((event) => event.detailTypeText ?? ""),
  ].join("\n");

  const reachable = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const type of metadata.localTypes) {
      if (reachable.has(type.name)) continue;
      const searchText = [
        surfaceText,
        // a type's own text always contains its own name, so it must not vote
        // for itself — only already-reachable types can pull it in
        ...metadata.localTypes
          .filter(
            (other) => reachable.has(other.name) && other.name !== type.name,
          )
          .map((other) => other.text),
      ].join("\n");
      if (new RegExp(`\\b${type.name}\\b`).test(searchText)) {
        reachable.add(type.name);
        changed = true;
      }
    }
  }

  const preamble = metadata.localTypes
    .filter((type) => reachable.has(type.name))
    .map((type) => qualify(dedent(type.text)));

  // an import is needed when one of the names it binds appears in any type we
  // are about to emit
  const emittedTypeText = [
    ...metadata.props.map((prop) => prop.typeText ?? ""),
    ...metadata.events.map((event) => event.detailTypeText ?? ""),
    ...preamble,
  ].join("\n");
  const imports = metadata.imports
    .filter((entry) =>
      entry.names.some((name) =>
        new RegExp(`\\b${name}\\b`).test(emittedTypeText),
      ),
    )
    .map((entry) =>
      rewriteSpecifier(entry.text, entry.source, componentDir, outputDir),
    );

  const typeOfProp = (prop: (typeof metadata.props)[number]) => {
    const text = propTypeText(prop);
    return text ? qualify(text) : "unknown";
  };

  const properties = metadata.props.map(
    (prop) =>
      `${jsDocBlock(prop.description, "  ")}  ${prop.name}${prop.optional ? "?" : ""}: ${typeOfProp(prop)};`,
  );

  // A prop that shadows a built-in DOM property (`title`, `id`, `slot`, …)
  // makes `extends HTMLElement` an "incorrectly extends" error whenever the
  // types differ. Omitting the built-in lets the component's own type stand,
  // which is what the element actually exposes.
  const shadowedProperties = metadata.props
    .map((prop) => prop.name)
    .filter((name) => HTML_ELEMENT_PROPERTIES.has(name));

  // Property-only props (functions, snippets) are deliberately absent from the
  // template surface. In a template `onSelect={fn}` is event-handler syntax,
  // not a property assignment, so advertising them as settable here would
  // type-check something that silently never runs — they are reachable only
  // through a DOM reference, which the element interface above covers.
  const templateMembers = metadata.props
    .filter((prop) => !prop.propertyOnly)
    .map((prop) => {
      const type = typeOfProp(prop);
      // anything written directly in markup arrives as a string, so non-string
      // props accept their own type (bound) or a string (literal attribute)
      return {
        name: prop.attribute ?? prop.name,
        type: type === "string" ? "string" : `${type} | string`,
        ...(prop.description ? { description: prop.description } : {}),
      };
    });

  const eventMap = metadata.events.map((event) => ({
    name: event.name,
    detail: event.detailTypeText ? qualify(event.detailTypeText) : "unknown",
    ...(event.description ? { description: event.description } : {}),
  }));

  return {
    tagName,
    className,
    preamble,
    imports,
    properties,
    shadowedProperties,
    templateMembers,
    eventMap,
    description: metadata.description,
  };
};

/**
 * Renders the framework-agnostic declarations: one DOM interface per element
 * plus the `HTMLElementTagNameMap` entries that make `querySelector` and
 * `createElement` return them.
 *
 * This half references nothing outside the DOM lib, so it is safe to append
 * to the component module's own emitted `.d.ts` — every consumer gets it just
 * by importing the package, whatever framework they use (or none).
 */
export const renderCoreDeclarations = (
  components: AnalyzedComponentFile[],
  outputDir: string,
  packageRoot: string,
): string => {
  const declarations = components.map((component) =>
    buildComponentDeclaration(component, outputDir, packageRoot),
  );

  const allImports = [
    ...new Set(declarations.flatMap((declaration) => declaration.imports)),
  ];

  const sections: string[] = [
    "// Element types generated by @svebcomponents/build. Do not edit.",
    "",
  ];

  if (allImports.length > 0) {
    sections.push(allImports.join("\n"), "");
  }

  for (const declaration of declarations) {
    if (declaration.preamble.length > 0) {
      sections.push(declaration.preamble.join("\n\n"), "");
    }
  }

  for (const declaration of declarations) {
    if (declaration.eventMap.length > 0) {
      const entries = declaration.eventMap
        .map(
          (event) =>
            `${jsDocBlock(event.description, "  ")}  "${event.name}": CustomEvent<${event.detail}>;`,
        )
        .join("\n");
      sections.push(
        `export interface ${declaration.className}EventMap {\n${entries}\n}`,
        "",
      );
    }
    const eventMembers =
      declaration.eventMap.length > 0
        ? `\n  addEventListener<K extends keyof ${declaration.className}EventMap>(
    type: K,
    listener: (this: ${declaration.className}Element, event: ${declaration.className}EventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof ${declaration.className}EventMap>(
    type: K,
    listener: (this: ${declaration.className}Element, event: ${declaration.className}EventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;`
        : "";
    const base =
      declaration.shadowedProperties.length > 0
        ? `Omit<HTMLElement, ${declaration.shadowedProperties
            .map((name) => `"${name}"`)
            .join(" | ")}>`
        : "HTMLElement";
    sections.push(
      `${jsDocBlock(declaration.description, "")}export interface ${declaration.className}Element extends ${base} {\n${declaration.properties.join("\n")}${eventMembers}\n}`,
      "",
    );
  }

  // The building blocks a consumer composes into their framework's own
  // template types. We deliberately stop here rather than shipping the
  // augmentations themselves: those have to name framework types we neither
  // depend on nor can test against, and their conventions move between major
  // versions. See the docs' Types section for the per-framework recipes.
  for (const declaration of declarations) {
    if (declaration.templateMembers.length > 0) {
      const members = declaration.templateMembers
        .map(
          (member) =>
            `${jsDocBlock(member.description, "  ")}  "${member.name}"?: ${member.type};`,
        )
        .join("\n");
      sections.push(
        `/**\n * Attributes \`<${declaration.tagName}>\` accepts in markup. Each also accepts\n * its string form, since that is what a literal attribute produces.\n */\nexport interface ${declaration.className}Attributes {\n${members}\n}`,
        "",
      );
    }

    if (declaration.eventMap.length > 0) {
      const handlers = declaration.eventMap
        .map(
          (event) =>
            `${jsDocBlock(event.description, "  ")}  "on${event.name}"?: (event: CustomEvent<${event.detail}>) => void;`,
        )
        .join("\n");
      sections.push(
        `/**\n * Handler props for the events \`<${declaration.tagName}>\` dispatches.\n */\nexport interface ${declaration.className}EventHandlers {\n${handlers}\n}`,
        "",
      );
    }
  }

  sections.push(
    `declare global {\n  interface HTMLElementTagNameMap {\n${declarations
      .map(
        (declaration) =>
          `    "${declaration.tagName}": ${declaration.className}Element;`,
      )
      .join("\n")}\n  }\n}`,
    "",
  );

  return sections.join("\n");
};

/**
 * The declaration file tsdown emits for an entry, which is what the export's
 * `types` condition points at (`src/index.ts` → `dist/client/index.d.ts`).
 */
const declarationFileFor = (
  cwd: string,
  entry: string,
  outDir: string,
): string =>
  path.resolve(
    cwd,
    outDir,
    `${path.basename(entry, path.extname(entry))}.d.ts`,
  );

/**
 * The absolute paths every export's `types` condition points at.
 *
 * Returns `undefined` when the package declares no such targets (a
 * `svebcomponents.config.ts` build, say), which tells the caller to fall back
 * to attaching to whatever each entry emitted.
 */
const readTypesTargets = async (
  cwd: string,
): Promise<Set<string> | undefined> => {
  let packageJson: unknown;
  try {
    packageJson = JSON.parse(
      await fs.readFile(path.resolve(cwd, "package.json"), "utf8"),
    );
  } catch {
    return undefined;
  }
  if (
    typeof packageJson !== "object" ||
    packageJson === null ||
    !("exports" in packageJson) ||
    typeof packageJson.exports !== "object" ||
    packageJson.exports === null
  ) {
    return undefined;
  }
  const targets = new Set<string>();
  for (const value of Object.values(
    packageJson.exports as Record<string, unknown>,
  )) {
    if (typeof value !== "object" || value === null) continue;
    const types = (value as { types?: unknown }).types;
    if (typeof types === "string") targets.add(path.resolve(cwd, types));
  }
  return targets.size > 0 ? targets : undefined;
};

/**
 * Writes the manifest, then attaches each entry's element types to the
 * declaration file that entry already ships.
 *
 * Appending to the module's own `.d.ts` means a consumer needs no reference
 * directive: importing the package for its side effect of defining the
 * element is enough to type `document.querySelector("my-el")`. Only the
 * framework template augmentations stay separate, since each imports from its
 * framework and must therefore be opt-in.
 */
export const emitElementTypes = async (
  cwd: string,
  tsdownOptions: UserConfig[],
): Promise<void> => {
  const components = await emitManifest(cwd, tsdownOptions);
  if (components.length === 0) return;

  const byPath = new Map(
    components.map((component) => [
      path.resolve(cwd, component.path),
      component,
    ]),
  );

  // Attach each entry's own elements to its own declaration file. Two entries
  // both declaring the same tag in `HTMLElementTagNameMap` would be a
  // duplicate-identifier error wherever both are loaded, so the mapping has to
  // be per entry rather than package-wide.
  // Only the file an export's `types` condition points at is ever loaded as
  // the package's types. A component is usually built several times (the
  // standalone browser bundle, the svelte-aware one, ssr) into different
  // output directories, and attaching global declarations to each would be
  // both wasteful and — if two were ever loaded together — a duplicate
  // `HTMLElementTagNameMap` entry.
  const typesTargets = await readTypesTargets(cwd);

  const attached = new Set<string>();
  for (const options of tsdownOptions) {
    const { entry, outDir } = options;
    if (typeof entry !== "string" || typeof outDir !== "string") continue;

    const declarationFile = declarationFileFor(cwd, entry, outDir);
    if (attached.has(declarationFile)) continue;
    if (typesTargets !== undefined && !typesTargets.has(declarationFile)) {
      continue;
    }

    const sources = await findComponentSourcesForEntry(cwd, entry);
    const owned = sources
      .map((source: string) => byPath.get(source))
      .filter(
        (component): component is AnalyzedComponentFile =>
          component !== undefined,
      );
    if (owned.length === 0) continue;

    let existing: string;
    try {
      existing = await fs.readFile(declarationFile, "utf8");
    } catch {
      // the entry produced no declarations (dts disabled for this config)
      continue;
    }

    const declarationDir = path.dirname(declarationFile);
    await fs.writeFile(
      declarationFile,
      `${existing.trimEnd()}\n\n${renderCoreDeclarations(owned, declarationDir, cwd)}`,
      "utf8",
    );
    attached.add(declarationFile);
  }

  await warnAboutExposure(cwd);
};

/**
 * Points out the `package.json` wiring the manifest needs to reach consumers.
 * Writing the file is only half of it: an unlisted file is not published, and
 * editors find the manifest through the `customElements` field.
 *
 * Only ever a hint: rewriting a user's `package.json` during a build would be
 * a surprising thing for a bundler to do.
 */
export const warnAboutExposure = async (cwd: string): Promise<void> => {
  let packageJson: Record<string, unknown>;
  try {
    packageJson = JSON.parse(
      await fs.readFile(path.resolve(cwd, "package.json"), "utf8"),
    ) as Record<string, unknown>;
  } catch {
    return;
  }

  const missing: string[] = [];

  if (typeof packageJson["customElements"] !== "string") {
    missing.push(`  "customElements": "${MANIFEST_FILE_NAME}"`);
  }

  const files = packageJson["files"];
  if (Array.isArray(files)) {
    const listed = files.map(String);
    const covered = listed.some(
      (entry) =>
        entry === MANIFEST_FILE_NAME ||
        entry === "*" ||
        MANIFEST_FILE_NAME.startsWith(entry.replace(/\/?\*+$/, "")),
    );
    if (!covered) {
      missing.push(`  "files": [..., "${MANIFEST_FILE_NAME}"]`);
    }
  }

  if (missing.length === 0) return;

  console.info(
    [
      `[svebcomponents]: ${MANIFEST_FILE_NAME} is not exposed to consumers.`,
      "Consider adding to package.json:",
      ...missing,
      "See https://svebcomponents.dev/core-concepts/build/#element-types--manifest",
    ].join("\n"),
  );
};
