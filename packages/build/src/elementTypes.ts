import fs from "node:fs/promises";
import path from "node:path";

import type { UserConfig } from "tsdown";

import {
  emitManifest,
  propTypeText,
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
 * Renders the declaration file: one DOM interface per element, the
 * `HTMLElementTagNameMap` entry that makes `querySelector` return it, and the
 * per-framework template augmentations.
 *
 * Svelte, Vue and React are all augmented unconditionally. An augmentation of
 * a module the consumer has not installed is inert — `declare module "vue"`
 * only takes effect once `vue` resolves — so a Svelte-only consumer is
 * unaffected by the Vue and React blocks.
 */
export const renderDeclarations = (
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
    "// Generated by @svebcomponents/build. Do not edit.",
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
        `interface ${declaration.className}EventMap {\n${entries}\n}`,
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

  // `querySelector("my-el")` and `document.createElement("my-el")`
  sections.push(
    `declare global {\n  interface HTMLElementTagNameMap {\n${declarations
      .map(
        (declaration) =>
          `    "${declaration.tagName}": ${declaration.className}Element;`,
      )
      .join("\n")}\n  }\n}`,
    "",
  );

  const templateBlock = (declaration: ComponentDeclaration, indent: string) => {
    const memberIndent = `${indent}  `;
    const members = [
      ...declaration.templateMembers.map(
        (member) =>
          `${jsDocBlock(member.description, memberIndent)}${memberIndent}"${member.name}"?: ${member.type};`,
      ),
      // event handlers are written as `onname={handler}` in every framework
      // whose template surface we augment
      ...declaration.eventMap.map(
        (event) =>
          `${jsDocBlock(event.description, memberIndent)}${memberIndent}"on${event.name}"?: (event: CustomEvent<${event.detail}>) => void;`,
      ),
    ];
    return `${indent}"${declaration.tagName}": {\n${members.join("\n")}\n${indent}};`;
  };

  sections.push(
    `declare module "svelte/elements" {\n  interface SvelteHTMLElements {\n${declarations
      .map((declaration) => templateBlock(declaration, "    "))
      .join("\n")}\n  }\n}`,
    "",
    `declare module "vue" {\n  interface GlobalComponents {\n${declarations
      .map((declaration) => templateBlock(declaration, "    "))
      .join("\n")}\n  }\n}`,
    "",
    // React 19 is required: earlier versions stringify every prop passed to a
    // custom element and do not attach listeners for custom event names, so
    // these signatures would not describe React 18's actual behaviour.
    `declare global {\n  namespace React {\n    namespace JSX {\n      interface IntrinsicElements {\n${declarations
      .map((declaration) => templateBlock(declaration, "        "))
      .join("\n")}\n      }\n    }\n  }\n}`,
    "",
    "export {};",
    "",
  );

  return sections.join("\n");
};

/**
 * Writes `custom-elements.json` and `custom-elements.d.ts` for the components
 * a build covers. Both are derived from the same analysis, so the manifest and
 * the generated types can never disagree.
 */
export const emitElementTypes = async (
  cwd: string,
  tsdownOptions: UserConfig[],
): Promise<void> => {
  const components = await emitManifest(cwd, tsdownOptions);
  if (components.length === 0) return;

  await fs.writeFile(
    path.resolve(cwd, DECLARATION_FILE_NAME),
    renderDeclarations(components, cwd, cwd),
    "utf8",
  );
};
