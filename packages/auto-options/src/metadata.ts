import { walk } from "zimmerframe";
import type {
  PrimitiveType,
  TypeDeclaration,
  TypedVariableDeclarator,
} from "./types";
import { resolvePropsTypeMembers } from "./inferProps.js";

export interface PropMetadata {
  name: string;
  /** The attribute name, absent for property-only props. */
  attribute?: string | undefined;
  reflects: boolean;
  /** The primitive attribute converter svelte will use. */
  type?: PrimitiveType | undefined;
  /**
   * The declared TypeScript type, verbatim as the author wrote it. Richer
   * than `type` (which is only ever one of the five attribute converters),
   * so generated declarations prefer it when present.
   */
  typeText?: string | undefined;
  description?: string | undefined;
  /** The default value expression, as written in the `$props()` destructuring. */
  default?: string | undefined;
  /**
   * True for props svelte exposes as JS properties only — functions and
   * snippets, which have no attribute representation.
   */
  propertyOnly: boolean;
  optional: boolean;
}

export interface SlotMetadata {
  /** The empty string denotes the default slot. */
  name: string;
  description?: string | undefined;
}

export interface EventMetadata {
  name: string;
  /**
   * The `CustomEvent` detail type, verbatim from the explicit type argument
   * (`new CustomEvent<Detail>(...)`). Absent when the author relied on
   * inference from the `detail` value, which cannot be recovered without a
   * type checker.
   */
  detailTypeText?: string | undefined;
  description?: string | undefined;
}

export interface CssPropertyMetadata {
  name: string;
  description?: string | undefined;
  default?: string | undefined;
}

export interface LocalTypeDeclaration {
  name: string;
  /** The declaration verbatim, e.g. `interface Detail { id: string }`. */
  text: string;
}

export interface TypeImport {
  /** The import statement verbatim. */
  text: string;
  /** The module specifier, so relative paths can be rewritten on emit. */
  source: string;
  /** The local binding names this import introduces. */
  names: string[];
}

export interface ComponentMetadata {
  description?: string | undefined;
  props: PropMetadata[];
  slots: SlotMetadata[];
  events: EventMetadata[];
  cssProperties: CssPropertyMetadata[];
  /**
   * Interfaces and type aliases declared in the instance script. Generated
   * declarations inline these, since a type named in `typeText` is otherwise
   * out of scope wherever the declaration is emitted.
   */
  localTypes: LocalTypeDeclaration[];
  /**
   * Imports from the instance script that a referenced type may resolve
   * through. Generated declarations re-emit the ones they actually need.
   */
  imports: TypeImport[];
}

interface ParsedJsDoc {
  description: string;
  tags: { tag: string; value: string }[];
}

/**
 * Turns a raw block-comment body (the `value` of an estree `Block` comment,
 * i.e. the text between `/*` and the closing delimiter) into its description
 * and `@tag` entries.
 */
export const parseJsDoc = (raw: string): ParsedJsDoc => {
  const lines = raw
    // a leading `*` marks the comment as JSDoc rather than an ordinary block
    .replace(/^\*/, "")
    .split("\n")
    // strip the decorative leading `*` each continuation line carries
    .map((line) => line.replace(/^\s*\*/, "").trim());

  const descriptionLines: string[] = [];
  const tags: { tag: string; value: string }[] = [];
  let current: { tag: string; value: string } | null = null;

  for (const line of lines) {
    const tagMatch = /^@(\w+)\s*(.*)$/.exec(line);
    if (tagMatch?.[1] !== undefined) {
      if (current) tags.push(current);
      current = { tag: tagMatch[1], value: tagMatch[2] ?? "" };
      continue;
    }
    if (current) {
      // a tag's value continues onto following unprefixed lines
      current.value = `${current.value}\n${line}`.trim();
      continue;
    }
    descriptionLines.push(line);
  }
  if (current) tags.push(current);

  return {
    description: descriptionLines.join("\n").trim(),
    tags,
  };
};

/**
 * Splits a `@slot name - description` / `@cssprop --name - description` style
 * tag value into its name and description halves. The separating dash is
 * optional, matching how these tags are written in practice.
 */
const splitNameAndDescription = (
  value: string,
): { name: string; description: string } => {
  const match = /^(\S+)\s*(?:-\s*)?([\s\S]*)$/.exec(value.trim());
  return {
    name: match?.[1] ?? "",
    description: (match?.[2] ?? "").trim(),
  };
};

/**
 * Merges scan results with `@tag`-documented entries of the same kind.
 *
 * Documentation is additive: it attaches a description to something the scan
 * already found, or declares a member the scan could not see (a dynamically
 * named slot, an event dispatched through a helper). It never contradicts
 * inferred structure.
 */
export const mergeDocumented = <
  T extends { name: string; description?: string | undefined },
>(
  scanned: T[],
  tagValues: string[],
  create: (name: string) => T,
): T[] => {
  const merged = new Map(scanned.map((entry) => [entry.name, entry]));
  for (const value of tagValues) {
    const { name, description } = splitNameAndDescription(value);
    // a lone dash names the default (unnamed) slot
    const key = name === "-" ? "" : name;
    if (key === "" && name !== "-" && description === "") continue;
    const existing = merged.get(key) ?? create(key);
    merged.set(key, {
      ...existing,
      ...(description ? { description } : {}),
    });
  }
  return [...merged.values()];
};

const jsDocOf = (node: unknown): ParsedJsDoc | null => {
  const comments = (
    node as { leadingComments?: { type: string; value: string }[] }
  ).leadingComments;
  const block = comments?.filter((comment) => comment.type === "Block").at(-1);
  return block ? parseJsDoc(block.value) : null;
};

/**
 * Extracts the component-level description from a `<!-- @component -->`
 * comment, svelte's documented convention for documenting a component.
 */
export const extractComponentDescription = (
  fragment: unknown,
): { description?: string; tags: { tag: string; value: string }[] } => {
  // collected into an array rather than a `let`: the assignment happens inside
  // a callback, which control-flow analysis cannot see through
  const found: ParsedJsDoc[] = [];
  walk(fragment as { type: string }, null, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- svelte AST comment nodes are not exposed in the public AST types
    Comment(node: any, context: { next: () => void }) {
      const data = typeof node.data === "string" ? node.data.trim() : "";
      if (found.length === 0 && data.startsWith("@component")) {
        found.push(parseJsDoc(data.replace(/^@component/, "")));
      }
      context.next();
    },
  });
  const parsed = found[0];
  if (!parsed) return { tags: [] };
  return {
    ...(parsed.description ? { description: parsed.description } : {}),
    tags: parsed.tags,
  };
};

/**
 * Reads the JSDoc and declared type text off the props type's member
 * signatures, keyed by prop name. Returns an empty map when the component's
 * props carry no resolvable type annotation.
 */
export const extractPropDocs = (
  code: string,
  propsDeclaration: TypedVariableDeclarator | undefined,
  typeDeclarations: TypeDeclaration[],
): Map<
  string,
  { description?: string; typeText?: string; optional: boolean }
> => {
  const docs = new Map<
    string,
    { description?: string; typeText?: string; optional: boolean }
  >();
  if (!propsDeclaration) return docs;
  const members = resolvePropsTypeMembers(propsDeclaration, typeDeclarations);
  if (!members) return docs;

  for (const member of members) {
    const name = member.key.name;
    if (typeof name !== "string") continue;
    const parsed = jsDocOf(member);
    // `typeAnnotation.typeAnnotation` is the type node itself; slicing the
    // original source keeps the author's spelling (`MyDetail`, `"a" | "b"`)
    // rather than a structurally expanded form
    const typeNode = (
      member as unknown as {
        typeAnnotation?: { typeAnnotation?: { start?: number; end?: number } };
      }
    ).typeAnnotation?.typeAnnotation;
    const typeText =
      typeof typeNode?.start === "number" && typeof typeNode?.end === "number"
        ? code.slice(typeNode.start, typeNode.end)
        : undefined;
    docs.set(name, {
      ...(parsed?.description ? { description: parsed.description } : {}),
      ...(typeText ? { typeText } : {}),
      optional: (member as unknown as { optional?: boolean }).optional === true,
    });
  }
  return docs;
};

/**
 * Reads the default value expressions out of the `$props()` destructuring
 * pattern, keyed by prop name.
 */
export const extractPropDefaults = (
  code: string,
  propsDeclaration: TypedVariableDeclarator | undefined,
): Map<string, string> => {
  const defaults = new Map<string, string>();
  const pattern = propsDeclaration?.id;
  if (!pattern || pattern.type !== "ObjectPattern") return defaults;
  for (const property of pattern.properties) {
    if (property.type !== "Property" || !("name" in property.key)) continue;
    const value = property.value;
    if (value.type !== "AssignmentPattern") continue;
    const right = value.right as { start?: number; end?: number };
    if (typeof right.start !== "number" || typeof right.end !== "number") {
      continue;
    }
    defaults.set(String(property.key.name), code.slice(right.start, right.end));
  }
  return defaults;
};

/**
 * Collects the component's `<slot>` elements. Only statically-named slots are
 * reported — a `name={expression}` slot has no build-time name to record.
 */
export const extractSlots = (fragment: unknown): SlotMetadata[] => {
  const slots = new Map<string, SlotMetadata>();
  walk(fragment as { type: string }, null, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SlotElement is not exposed in the public AST types
    SlotElement(node: any, context: { next: () => void }) {
      const nameAttribute = node.attributes?.find(
        (attribute: { type: string; name: string }) =>
          attribute.type === "Attribute" && attribute.name === "name",
      );
      let name = "";
      if (nameAttribute) {
        const value = nameAttribute.value;
        // a static attribute value parses as a single Text node; anything
        // else (an ExpressionTag, or a mix) is dynamic and unnameable here
        const textNode = Array.isArray(value) ? value[0] : undefined;
        if (
          Array.isArray(value) &&
          value.length === 1 &&
          textNode?.type === "Text"
        ) {
          name = String(textNode.data);
        } else {
          context.next();
          return;
        }
      }
      if (!slots.has(name)) slots.set(name, { name });
      context.next();
    },
  });
  return [...slots.values()];
};

/**
 * Collects custom events the component dispatches on its host element.
 *
 * Matches `$host().dispatchEvent(new CustomEvent("name"))` — the pattern this
 * project endorses, since `createEventDispatcher` events do not survive
 * hydration. `$`-prefixed names are reserved for runes, so a `$host` callee is
 * always the rune and cannot be shadowed; a `const host = $host()` alias is
 * followed as well. Only string-literal event names are recorded.
 */
export const extractEvents = (code: string, root: unknown): EventMetadata[] => {
  // identifiers bound to `$host()`, so the common alias form is recognised
  const hostAliases = new Set<string>();
  walk(root as { type: string }, null, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the walked tree mixes svelte AST and estree nodes
    VariableDeclarator(node: any, context: { next: () => void }) {
      if (
        node.id?.type === "Identifier" &&
        node.init?.type === "CallExpression" &&
        node.init.callee?.type === "Identifier" &&
        node.init.callee.name === "$host"
      ) {
        hostAliases.add(node.id.name);
      }
      context.next();
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  const isHostReceiver = (node: any): boolean => {
    if (!node) return false;
    if (
      node.type === "CallExpression" &&
      node.callee?.type === "Identifier" &&
      node.callee.name === "$host"
    ) {
      return true;
    }
    return node.type === "Identifier" && hostAliases.has(node.name);
  };

  const events = new Map<string, EventMetadata>();
  walk(root as { type: string }, null, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
    CallExpression(node: any, context: { next: () => void }) {
      const callee = node.callee;
      if (
        callee?.type === "MemberExpression" &&
        callee.property?.name === "dispatchEvent" &&
        isHostReceiver(callee.object)
      ) {
        const argument = node.arguments?.[0];
        if (
          argument?.type === "NewExpression" &&
          argument.callee?.type === "Identifier" &&
          argument.callee.name === "CustomEvent"
        ) {
          const nameArgument = argument.arguments?.[0];
          if (
            nameArgument?.type === "Literal" &&
            typeof nameArgument.value === "string"
          ) {
            // the explicit type argument is the only statically recoverable
            // detail type — an inferred one would need a type checker
            const typeArgument = argument.typeArguments?.params?.[0];
            const detailTypeText =
              typeof typeArgument?.start === "number" &&
              typeof typeArgument?.end === "number"
                ? code.slice(typeArgument.start, typeArgument.end)
                : undefined;
            const existing = events.get(nameArgument.value);
            // a later dispatch carrying a detail type wins over an earlier
            // bare one, so one annotated call site is enough
            if (!existing || (detailTypeText && !existing.detailTypeText)) {
              events.set(nameArgument.value, {
                name: nameArgument.value,
                ...(detailTypeText ? { detailTypeText } : {}),
              });
            }
          }
        }
      }
      context.next();
    },
  });
  return [...events.values()];
};

/**
 * Captures the interfaces and type aliases declared in the instance script,
 * verbatim, so generated declarations can inline the ones they reference.
 */
export const extractLocalTypes = (
  code: string,
  typeDeclarations: TypeDeclaration[],
): LocalTypeDeclaration[] => {
  const types: LocalTypeDeclaration[] = [];
  for (const declaration of typeDeclarations) {
    const name = "id" in declaration ? declaration.id.name : undefined;
    const span = declaration as unknown as { start?: number; end?: number };
    if (
      typeof name !== "string" ||
      typeof span.start !== "number" ||
      typeof span.end !== "number"
    ) {
      continue;
    }
    types.push({ name, text: code.slice(span.start, span.end) });
  }
  return types;
};

/**
 * Captures the instance script's imports along with the names they bind, so a
 * generated declaration can re-emit exactly the ones a referenced type needs.
 */
export const extractTypeImports = (
  code: string,
  instance: unknown,
): TypeImport[] => {
  if (!instance) return [];
  const imports: TypeImport[] = [];
  walk(instance as { type: string }, null, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- estree import nodes are not exposed in the public svelte AST types
    ImportDeclaration(node: any, context: { next: () => void }) {
      const source = node.source?.value;
      if (
        typeof source !== "string" ||
        typeof node.start !== "number" ||
        typeof node.end !== "number"
      ) {
        context.next();
        return;
      }
      const names = (node.specifiers ?? [])
        .map((specifier: { local?: { name?: string } }) => specifier.local?.name)
        .filter((name: unknown): name is string => typeof name === "string");
      imports.push({ text: code.slice(node.start, node.end), source, names });
      context.next();
    },
  });
  return imports;
};

const CSS_VAR_REFERENCE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/g;

/**
 * Collects the CSS custom properties a component reads but does not define
 * itself — the ones a consumer is expected to supply, i.e. the component's
 * styling API.
 *
 * Properties the component also declares in its own stylesheet are treated as
 * internal implementation detail and omitted. A `@cssprop` tag on the
 * component's `<!-- @component -->` comment adds a description, and can
 * document a property this scan cannot see.
 */
export const extractCssProperties = (css: unknown): CssPropertyMetadata[] => {
  if (!css) return [];
  const referenced = new Map<string, string | undefined>();
  const declared = new Set<string>();

  walk(css as { type: string }, null, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the css AST is not exposed in the public AST types
    Declaration(node: any, context: { next: () => void }) {
      const property = typeof node.property === "string" ? node.property : "";
      if (property.startsWith("--")) {
        declared.add(property);
      }
      const value = typeof node.value === "string" ? node.value : "";
      for (const match of value.matchAll(CSS_VAR_REFERENCE)) {
        const name = match[1];
        if (name === undefined) continue;
        const fallback = match[2]?.trim();
        if (!referenced.has(name)) {
          referenced.set(
            name,
            fallback && fallback.length > 0 ? fallback : undefined,
          );
        }
      }
      context.next();
    },
  });

  return [...referenced.entries()]
    .filter(([name]) => !declared.has(name))
    .map(([name, fallback]) => ({
      name,
      ...(fallback ? { default: fallback } : {}),
    }));
};
