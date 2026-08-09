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

export type Framework = "svelte" | "vue" | "react";

/**
 * Renders the template-surface augmentation for one framework.
 *
 * These are separate, opt-in files rather than part of the module's own
 * declarations because each one *imports* from its framework — a Svelte-only
 * consumer must not be made to resolve `vue`. The element interfaces they
 * build on come from the module, which is imported by type-only reference.
 *
 * Each entry composes the framework's own base attribute type (so `class`,
 * `id` and DOM event handlers keep working) with this element's attributes
 * and custom event handlers.
 */
export const renderFrameworkDeclarations = (
  framework: Framework,
  components: AnalyzedComponentFile[],
  outputDir: string,
  packageRoot: string,
  /**
   * Where each component's element interface can be imported from, keyed by
   * the component's package-relative source path. A package with several
   * entries ships one declaration file per entry, so the specifier differs
   * per component.
   */
  coreSpecifiers: Map<string, string>,
): string => {
  const declarations = components.map((component) => ({
    ...buildComponentDeclaration(component, outputDir, packageRoot),
    specifier: coreSpecifiers.get(component.path) ?? "./index.js",
  }));

  // one import statement per declaration file the elements come from
  const bySpecifier = new Map<string, string[]>();
  for (const declaration of declarations) {
    const names = [
      `${declaration.className}Element`,
      ...(declaration.eventMap.length > 0
        ? [`${declaration.className}EventMap`]
        : []),
    ];
    bySpecifier.set(declaration.specifier, [
      ...(bySpecifier.get(declaration.specifier) ?? []),
      ...names,
    ]);
  }

  const attributesOf = (declaration: ComponentDeclaration, indent: string) => {
    const memberIndent = `${indent}  `;
    return declaration.templateMembers
      .map(
        (member) =>
          `${jsDocBlock(member.description, memberIndent)}${memberIndent}"${member.name}"?: ${member.type};`,
      )
      .join("\n");
  };

  const handlersOf = (declaration: ComponentDeclaration, indent: string) => {
    const memberIndent = `${indent}  `;
    return declaration.eventMap
      .map(
        (event) =>
          `${jsDocBlock(event.description, memberIndent)}${memberIndent}"on${event.name}"?: (event: CustomEvent<${event.detail}>) => void;`,
      )
      .join("\n");
  };

  const header = [
    "// Element types generated by @svebcomponents/build. Do not edit.",
    "",
    ...[...bySpecifier.entries()].map(
      ([specifier, names]) =>
        `import type { ${[...new Set(names)].join(", ")} } from "${specifier}";`,
    ),
    "",
  ];

  if (framework === "svelte") {
    return [
      ...header,
      'import type { HTMLAttributes } from "svelte/elements";',
      "",
      'declare module "svelte/elements" {',
      "  interface SvelteHTMLElements {",
      ...declarations.map((declaration) => {
        const members = [
          attributesOf(declaration, "    "),
          handlersOf(declaration, "    "),
        ]
          .filter((part) => part.length > 0)
          .join("\n");
        // composing with HTMLAttributes keeps `class`, `id`, `style` and the
        // standard DOM event handlers available on the element
        return `    "${declaration.tagName}": HTMLAttributes<${declaration.className}Element> & {\n${members}\n    };`;
      }),
      "  }",
      "}",
      "",
      "export {};",
      "",
    ].join("\n");
  }

  if (framework === "react") {
    return [
      ...header,
      'import type { DetailedHTMLProps, HTMLAttributes } from "react";',
      "",
      "declare module 'react' {",
      "  namespace JSX {",
      "    interface IntrinsicElements {",
      ...declarations.map((declaration) => {
        const members = [
          attributesOf(declaration, "      "),
          handlersOf(declaration, "      "),
        ]
          .filter((part) => part.length > 0)
          .join("\n");
        return `      "${declaration.tagName}": DetailedHTMLProps<HTMLAttributes<${declaration.className}Element>, ${declaration.className}Element> & {\n${members}\n      };`;
      }),
      "    }",
      "  }",
      "}",
      "",
      "export {};",
      "",
    ].join("\n");
  }

  // Vue needs a component-like type, not a bag of props: its template checker
  // reads `$props` for attributes and `$emit` for events.
  return [
    ...header,
    'import type { HTMLAttributes as VueHTMLAttributes, PublicProps } from "vue";',
    "",
    "type SvebEventMap = Record<string, Event>;",
    "",
    "type SvebDefineCustomElement<",
    "  ElementType extends HTMLElement,",
    "  Events extends SvebEventMap = SvebEventMap,",
    "  Attributes extends Record<string, unknown> = Record<string, never>,",
    "> = new () => ElementType & {",
    "  $props: VueHTMLAttributes & Partial<Attributes> & PublicProps;",
    "  $emit: <K extends keyof Events>(event: K, payload: Events[K]) => void;",
    "};",
    "",
    ...declarations.flatMap((declaration) => {
      const members = attributesOf(declaration, "");
      return [
        `type ${declaration.className}Attributes = {\n${members}\n};`,
        "",
      ];
    }),
    'declare module "vue" {',
    "  interface GlobalComponents {",
    ...declarations.map((declaration) => {
      const events =
        declaration.eventMap.length > 0
          ? `${declaration.className}EventMap`
          : "SvebEventMap";
      return `    "${declaration.tagName}": SvebDefineCustomElement<${declaration.className}Element, ${events}, ${declaration.className}Attributes>;`;
    }),
    "  }",
    "}",
    "",
    "export {};",
    "",
  ].join("\n");
};

const FRAMEWORK_FILE_NAMES: Record<Framework, string> = {
  svelte: "custom-elements-svelte.d.ts",
  vue: "custom-elements-vue.d.ts",
  react: "custom-elements-react.d.ts",
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
  const coreSpecifiers = new Map<string, string>();
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

    // the framework files sit at the package root and import the element
    // interfaces from wherever this entry's declarations landed
    const specifier = `./${path
      .relative(cwd, declarationFile)
      .split(path.sep)
      .join("/")
      .replace(/\.d\.ts$/, ".js")}`;
    for (const component of owned) {
      coreSpecifiers.set(component.path, specifier);
    }
  }

  // The framework augmentations describe every element the package ships:
  // a consumer references one file, not one per entry.
  if (coreSpecifiers.size === 0) return;
  for (const framework of Object.keys(FRAMEWORK_FILE_NAMES) as Framework[]) {
    await fs.writeFile(
      path.resolve(cwd, FRAMEWORK_FILE_NAMES[framework]),
      renderFrameworkDeclarations(
        framework,
        components.filter((component) => coreSpecifiers.has(component.path)),
        cwd,
        cwd,
        coreSpecifiers,
      ),
      "utf8",
    );
  }

  await warnAboutExposure(cwd, Object.values(FRAMEWORK_FILE_NAMES));
};

/**
 * Points out the `package.json` wiring the generated files need to reach
 * consumers. Emitting the files is only half of it — an unlisted file is not
 * published, and with `exports` declared, a subpath that is not mapped cannot
 * be referenced by a consumer at all.
 *
 * Only ever a hint: rewriting a user's `package.json` during a build would be
 * a surprising thing for a bundler to do.
 */
export const warnAboutExposure = async (
  cwd: string,
  frameworkFiles: string[],
): Promise<void> => {
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
    const covers = (name: string) =>
      listed.some(
        (entry) =>
          entry === name ||
          entry === "*" ||
          name.startsWith(entry.replace(/\/?\*+$/, "")),
      );
    const unlisted = [MANIFEST_FILE_NAME, ...frameworkFiles].filter(
      (name) => !covers(name),
    );
    if (unlisted.length > 0) {
      missing.push(
        `  "files": [..., ${unlisted.map((name) => `"${name}"`).join(", ")}]`,
      );
    }
  }

  const exportsField = packageJson["exports"];
  if (typeof exportsField === "object" && exportsField !== null) {
    const declared = Object.keys(exportsField as Record<string, unknown>);
    const unexported = frameworkFiles.filter(
      (name) => !declared.includes(`./${name}`),
    );
    if (unexported.length > 0) {
      missing.push(
        ...unexported.map(
          (name) => `  "exports": { "./${name}": "./${name}" }`,
        ),
      );
    }
  }

  if (missing.length === 0) return;

  console.info(
    [
      "[svebcomponents]: generated element metadata is not fully exposed to consumers.",
      "Consider adding to package.json:",
      ...missing,
      "See https://svebcomponents.dev/core-concepts/build/#element-types--manifest",
    ].join("\n"),
  );
};
