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

const escapeRegExp = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * String and template literals appearing in type text. Their contents are
 * values, not type references, so name rewriting must skip them.
 */
const STRING_LITERAL = /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g;

/**
 * Rewrites references to a component's locally declared types so several
 * components can contribute to one declaration file without colliding.
 *
 * A type declared inside `Button.svelte` is file-scoped in the source but
 * module-scoped once inlined here, so `Detail` becomes `Button$Detail`. Only
 * whole-word matches of names we actually inlined are rewritten.
 *
 * Literals are stepped over rather than rewritten. A literal type whose value
 * happens to spell a local type name (`type Mode = "Detail" | "summary"`
 * alongside `interface Detail`) would otherwise be corrupted into
 * `"Button$Detail"` — a type consumers cannot satisfy with the value the
 * component actually accepts.
 *
 * All names are matched in one alternation rather than replaced one after
 * another, so an already-rewritten name can never be rewritten again (which
 * `Button$Button` would otherwise do for a local type sharing the prefix).
 */
const qualifyLocalTypes = (
  text: string,
  localTypeNames: Set<string>,
  prefix: string,
): string => {
  if (localTypeNames.size === 0) return text;
  const names = new RegExp(
    `\\b(?:${[...localTypeNames].map(escapeRegExp).join("|")})\\b`,
    "g",
  );
  const qualify = (segment: string) =>
    segment.replace(names, (name) => `${prefix}$${name}`);

  let result = "";
  let index = 0;
  for (const literal of text.matchAll(STRING_LITERAL)) {
    result += qualify(text.slice(index, literal.index));
    result += literal[0];
    index = literal.index + literal[0].length;
  }
  return result + qualify(text.slice(index));
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
  /** camelCase props a Svelte template sets as JavaScript properties. */
  propertyMembers: { name: string; type: string; description?: string }[];
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
      const attribute = prop.attribute ?? prop.name;
      // An attribute is a string. The prop's own type belongs here only when
      // the attribute name is also the property name, because that is the one
      // case where a framework sets the property instead of writing an
      // attribute — `count={5}` assigns, `thread-data={tree}` stringifies to
      // "[object Object]". Offering the rich type under a kebab name
      // type-checked a value that could never arrive intact.
      const settableAsProperty = attribute === prop.name;
      return {
        name: attribute,
        type:
          type === "string" || !settableAsProperty
            ? "string"
            : `${type} | string`,
        ...(prop.description ? { description: prop.description } : {}),
      };
    });

  // A custom element's public surface is properties as well as attributes, and
  // in a Svelte template `preloadedData={value}` assigns the property rather
  // than writing an attribute. That is the only way to pass anything that does
  // not survive being turned into a string — an object, an array, a function —
  // so the template surface has to describe it, with the prop's real type
  // rather than the attribute's widened `T | string`.
  //
  // Skipped:
  //
  // - props whose attribute name is already the prop name (`count`), which the
  //   attribute member above covers; emitting both would be a duplicate key.
  // - `on`-prefixed props, which Svelte reads as event-handler syntax rather
  //   than a property assignment, so typing them settable here would
  //   type-check something that never runs.
  const attributeNames = new Set(templateMembers.map((member) => member.name));
  // Whatever is not addressable as an attribute is addressable as a property,
  // under the prop's own name and with its own type.
  const propertyMembers = metadata.props
    .filter(
      (prop) => !attributeNames.has(prop.name) && !/^on[A-Z]/.test(prop.name),
    )
    .map((prop) => ({
      name: prop.name,
      type: typeOfProp(prop),
      ...(prop.description ? { description: prop.description } : {}),
    }));

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
    propertyMembers,
    eventMap,
    description: metadata.description,
  };
};

/**
 * Renders the framework-agnostic declarations: one DOM interface per element
 * plus the `HTMLElementTagNameMap` entries that make `querySelector` and
 * `createElement` return them.
 *
 * This half references nothing outside the DOM lib, so it is safe in the
 * component module's generated `.d.ts` — every consumer gets it just by
 * importing the package, whatever framework they use (or none).
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
        `/**\n * Attributes \`<${declaration.tagName}>\` accepts in markup.\n *\n * An attribute is always a string. A prop whose name kebab-cases to something\n * else is reachable only as a property — see \`${declaration.className}Props\`.\n */\nexport interface ${declaration.className}Attributes {\n${members}\n}`,
        "",
      );
    }

    if (declaration.propertyMembers.length > 0) {
      const members = declaration.propertyMembers
        .map(
          (member) =>
            `${jsDocBlock(member.description, "  ")}  "${member.name}"?: ${member.type};`,
        )
        .join("\n");
      sections.push(
        `/**\n * Properties \`<${declaration.tagName}>\` accepts from a template, under their\n * own names and with their own types.\n *\n * React, Vue and Svelte all assign a property when the element has one and\n * write an attribute otherwise, so this is how a value that does not survive\n * being turned into a string — an object, an array — is passed.\n *\n * Function and snippet props are not included: in a template \`onSelect={fn}\`\n * is event-handler syntax rather than a property assignment. Set those through\n * a DOM reference, where \`${declaration.className}Element\` types them.\n */\nexport interface ${declaration.className}Props {\n${members}\n}`,
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
 * The public declaration path for an entry, which is what the export's `types`
 * condition points at
 * (`src/ExampleComponent.svelte` → `dist/client/ExampleComponent.d.ts`).
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

/** The runtime default export of a directly compiled custom element entry. */
export const renderComponentDefaultExport = (
  component: AnalyzedComponentFile,
): string =>
  `declare const ${component.className}: {\n  new (): ${component.className}Element;\n};\n\nexport default ${component.className};`;

/**
 * Renders the `svelte/elements` augmentation that teaches Svelte templates
 * about these elements.
 *
 * Always written, but to a file of its own rather than into the entry's
 * declarations, because it can only ever be loaded where svelte exists: it
 * imports `HTMLAttributes` from `svelte/elements`, and augmenting a module
 * requires that module to resolve. Composing `HTMLAttributes` is what keeps
 * `class`, `id` and the standard DOM event handlers working alongside the
 * element's own attributes.
 *
 * Keeping it separate is what stops "I want Svelte template types" from
 * forcing "every one of my consumers must install svelte". A package that does
 * require svelte gets it referenced automatically; everyone else can point
 * their Svelte consumers at the file.
 */
export const renderSvelteAugmentation = (
  components: AnalyzedComponentFile[],
  outputDir: string,
  packageRoot: string,
  /** Sibling declaration file the element interfaces are imported from. */
  declarationSpecifier: string,
): string => {
  const declarations = components.map((component) =>
    buildComponentDeclaration(component, outputDir, packageRoot),
  );

  const entries = declarations.map((declaration) => {
    const members = [
      ...declaration.templateMembers.map(
        (member) =>
          `${jsDocBlock(member.description, "      ")}      "${member.name}"?: ${member.type};`,
      ),
      ...declaration.propertyMembers.map(
        (member) =>
          `${jsDocBlock(member.description, "      ")}      "${member.name}"?: ${member.type};`,
      ),
      ...declaration.eventMap.map(
        (event) =>
          `${jsDocBlock(event.description, "      ")}      "on${event.name}"?: (event: CustomEvent<${event.detail}>) => void;`,
      ),
    ].join("\n");
    return `    "${declaration.tagName}": __SvebHTMLAttributes<${declaration.className}Element> & {\n${members}\n    };`;
  });

  const elementTypes = declarations
    .map((declaration) => `${declaration.className}Element`)
    .join(", ");

  return [
    "// Svelte template types generated by @svebcomponents/build. Do not edit.",
    "// Loading this file requires svelte, so it is kept out of the package's",
    "// main declarations — see https://svebcomponents.dev/guides/framework-types/",
    'import type { HTMLAttributes as __SvebHTMLAttributes } from "svelte/elements";',
    `import type { ${elementTypes} } from "${declarationSpecifier}";`,
    "",
    'declare module "svelte/elements" {',
    "  interface SvelteHTMLElements {",
    ...entries,
    "  }",
    "}",
    "",
  ].join("\n");
};

/** Sibling file the Svelte template types are written to. */
export const svelteTypesFileFor = (declarationFile: string): string =>
  declarationFile.replace(/\.d\.ts$/, ".svelte-types.d.ts");

/**
 * Whether every consumer of this package is guaranteed to have `svelte`
 * installed — true when it is a runtime dependency, or a peer dependency that
 * is not marked optional. An optional peer may be absent, which is exactly the
 * case the svelte augmentation must not be emitted for.
 */
export const requiresSvelte = (packageJson: unknown): boolean => {
  if (typeof packageJson !== "object" || packageJson === null) return false;
  const record = packageJson as Record<string, unknown>;

  const dependencies = record["dependencies"];
  if (
    typeof dependencies === "object" &&
    dependencies !== null &&
    "svelte" in dependencies
  ) {
    return true;
  }

  const peers = record["peerDependencies"];
  if (typeof peers !== "object" || peers === null || !("svelte" in peers)) {
    return false;
  }
  const meta = record["peerDependenciesMeta"];
  const svelteMeta =
    typeof meta === "object" && meta !== null
      ? (meta as Record<string, unknown>)["svelte"]
      : undefined;
  const optional =
    typeof svelteMeta === "object" &&
    svelteMeta !== null &&
    (svelteMeta as { optional?: unknown })["optional"] === true;
  return !optional;
};

const readPackageJson = async (cwd: string): Promise<unknown> => {
  try {
    return JSON.parse(
      await fs.readFile(path.resolve(cwd, "package.json"), "utf8"),
    );
  } catch {
    return undefined;
  }
};

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
  const packageJson = await readPackageJson(cwd);
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
 * Writes the manifest, then emits each direct component entry's complete
 * declaration.
 *
 * Only direct `.svelte` entries produce element types. A script entry is an
 * ordinary module — `findComponentSourcesForEntry` reports no components for
 * one, even when it imports Svelte source — so a component reachable only
 * through a script entry contributes neither a manifest declaration nor types.
 * Declaring the tag as a literal in `<svelte:options>` is what makes an element
 * describable at build time.
 *
 * Keeping everything in the export's own `.d.ts` means a consumer needs no
 * reference directive: importing the package is enough to type both its
 * default constructor and `document.querySelector("my-el")`.
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

  // Svelte template types are always written, but to their own file. They are
  // only referenced from the package's main declarations when every consumer is
  // guaranteed to have svelte — otherwise the `svelte/elements` import would
  // fail to resolve for them. Everyone else points their Svelte consumers at
  // the file instead, which is what keeps wanting template types from forcing
  // svelte on the whole consumer base.
  const packageJson = await readPackageJson(cwd);
  const withSvelteTypes = requiresSvelte(packageJson);

  const attached = new Set<string>();
  const svelteTypesFiles: string[] = [];
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
    // Only a direct `.svelte` entry gets this far: a script entry yields no
    // component sources, so `owned` is empty. Such an entry therefore always
    // has a primary component, and tsdown left its declaration file to us —
    // declarations are disabled for `.svelte` entries because tsdown cannot
    // produce them, so there is nothing here to preserve.
    if (owned.length === 0) continue;
    const primary = byPath.get(path.resolve(cwd, entry));
    if (primary === undefined) continue;

    const declarationDir = path.dirname(declarationFile);
    // tsdown has normally created this already; doing it here keeps the emit
    // independent of that, and of build ordering.
    await fs.mkdir(declarationDir, { recursive: true });
    const svelteTypesFile = svelteTypesFileFor(declarationFile);
    const declarationSpecifier = `./${path.basename(declarationFile).replace(/\.d\.ts$/, ".js")}`;
    await fs.writeFile(
      svelteTypesFile,
      renderSvelteAugmentation(
        owned,
        declarationDir,
        cwd,
        declarationSpecifier,
      ),
      "utf8",
    );
    svelteTypesFiles.push(path.relative(cwd, svelteTypesFile));

    const generated = [
      // A reference rather than an inlined copy, so the augmentation has one
      // home whether it is loaded automatically or by the consumer. It has to
      // lead the file: TypeScript only honours triple-slash directives before
      // any declaration, and silently ignores one that follows them.
      ...(withSvelteTypes
        ? [`/// <reference path="./${path.basename(svelteTypesFile)}" />`, ""]
        : []),
      renderCoreDeclarations(owned, declarationDir, cwd),
      renderComponentDefaultExport(primary),
    ].join("\n");
    await fs.writeFile(declarationFile, `${generated}\n`, "utf8");
    attached.add(declarationFile);
  }

  await warnAboutExposure(cwd, withSvelteTypes ? [] : svelteTypesFiles);
};

/**
 * Points out the `package.json` wiring the manifest needs to reach consumers.
 * Writing the file is only half of it: an unlisted file is not published, and
 * editors find the manifest through the `customElements` field.
 *
 * Only ever a hint: rewriting a user's `package.json` during a build would be
 * a surprising thing for a bundler to do.
 */
export const warnAboutExposure = async (
  cwd: string,
  /**
   * Svelte template-type files the package does not reference automatically.
   * Without an export subpath a consumer cannot reach them, so the types exist
   * but nobody can load them.
   */
  unreferencedSvelteTypes: string[] = [],
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

  if (missing.length > 0) {
    console.info(
      [
        `[svebcomponents]: ${MANIFEST_FILE_NAME} is not exposed to consumers.`,
        "Consider adding to package.json:",
        ...missing,
        "See https://svebcomponents.dev/guides/build/#element-types--manifest",
      ].join("\n"),
    );
  }

  const exports = packageJson["exports"];
  const exported =
    typeof exports === "object" &&
    exports !== null &&
    JSON.stringify(exports).includes(".svelte-types.d.ts");
  if (unreferencedSvelteTypes.length === 0 || exported) return;

  console.info(
    [
      "[svebcomponents]: Svelte template types were generated but are not",
      "reachable by consumers. This package does not require svelte of them, so",
      "the types are kept in their own file rather than loaded automatically.",
      "Expose it so Svelte consumers can opt in:",
      `  "exports": { "./svelte": { "types": "./${unreferencedSvelteTypes[0]!.split(path.sep).join("/")}" } }`,
      "See https://svebcomponents.dev/guides/framework-types/",
    ].join("\n"),
  );
};
