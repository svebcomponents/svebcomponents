import { parse } from "svelte/compiler";
import { walk } from "zimmerframe";
import type {
  InferredSvelteOptionProps,
  TypeDeclaration,
  TypedVariableDeclarator,
} from "./types.js";
import {
  inferPropsFromComponentPropDeclaration,
  inferPropsFromSvelteOptions,
  inferPropsFromTypes,
} from "./inferProps.js";
import {
  extractSvelteOptions,
  type SvelteOptions,
} from "./extractSvelteOptionsProps.js";
import {
  extractComponentDescription,
  extractCssProperties,
  extractEvents,
  extractPropDefaults,
  extractPropDocs,
  extractLocalTypes,
  extractSlots,
  extractTypeImports,
  mergeDocumented,
  type ComponentMetadata,
  type CssPropertyMetadata,
  type PropMetadata,
  type SlotMetadata,
} from "./metadata.js";

export type {
  ComponentMetadata,
  CssPropertyMetadata,
  EventMetadata,
  LocalTypeDeclaration,
  PropMetadata,
  SlotMetadata,
  TypeImport,
} from "./metadata.js";

/**
 * Infrastructure components (like `@svebcomponents/ssr`'s HydrationHost) opt
 * out of processing by including this marker. Transforming them would inject
 * bogus custom element options and, worse, circular imports back into the
 * runtime — and they are not part of any package's public element surface,
 * so metadata consumers must skip them too.
 */
export const IGNORE_MARKER = "svebcomponents:auto-options-ignore";

export interface AnalyzedComponent {
  /**
   * The statically-known custom element tag, from either the string
   * shorthand (`customElement="my-el"`) or the object form's `tag`
   * property. `null` when the component does not declare a custom element,
   * or declares one whose tag cannot be resolved at build time.
   */
  tagName: string | null;
  /**
   * The inferred prop metadata, keyed by prop name. Assembled from
   * `<svelte:options>`, TypeScript types and the `$props()` destructuring —
   * see `inferProps.ts` for the precedence rules.
   */
  props: InferredSvelteOptionProps;
  /** The raw `<svelte:options>` extraction, carrying injection positions. */
  svelteOptions: SvelteOptions | null;
  /**
   * Byte offset right after the instance `<script ...>` tag's closing `>`,
   * or `null` when the component has no instance script. Injection targets
   * this position; metadata consumers ignore it.
   */
  scriptContentStart: number | null;
  /** Whether a `$props()` declaration was found in the instance script. */
  hasPropsDeclaration: boolean;
  /**
   * The component's documented public surface — props, slots, events and CSS
   * custom properties. Injection ignores this entirely; it exists for the
   * manifest and the generated type declarations.
   */
  metadata: ComponentMetadata;
}

/**
 * Parses a Svelte component and derives everything svebcomponents knows about
 * its custom element surface, without mutating anything.
 *
 * This is deliberately free of both bundler and output concerns: the
 * `auto-options` transform uses it to drive code injection, while the manifest
 * generator uses it to describe the element for consumers. Keeping one
 * analyzer means the two can never disagree about what a component exposes.
 *
 * Returns `null` when the file opts out of processing, or is not parseable as
 * a component with a custom element surface.
 */
export const analyzeComponent = (
  code: string,
  id: string,
): AnalyzedComponent | null => {
  if (code.includes(IGNORE_MARKER)) {
    return null;
  }

  const root = parse(code, {
    filename: id,
    modern: true,
  });
  const { instance, options } = root;

  const svelteOptions = extractSvelteOptions(options);

  let propsDeclaration: TypedVariableDeclarator | undefined;
  const typeDeclarations: TypeDeclaration[] = [];
  if (instance) {
    walk(instance.content, null, {
      Program(node) {
        // our AST doesn't have types for TS nodes, so we add them manually
        type TsNode = (typeof node.body)[number] | TypeDeclaration;
        for (const statement of node.body as TsNode[]) {
          switch (statement.type) {
            case "VariableDeclaration":
              for (const declaration of statement.declarations) {
                // since props are always declared as `const props = $props()` in svelte,
                // we can skip to the next statement if this declaration is not initialized via a call expression
                if (
                  !declaration.init ||
                  declaration.init.type !== "CallExpression" ||
                  declaration.init.callee.type !== "Identifier" ||
                  declaration.init.callee.name !== "$props"
                ) {
                  continue;
                }
                propsDeclaration = declaration as TypedVariableDeclarator;
              }
              break;
            case "TSInterfaceDeclaration":
              typeDeclarations.push(statement);
              break;
            case "TSTypeAliasDeclaration":
              typeDeclarations.push(statement);
              break;
          }
        }
      },
    });
  }

  // We 'automatically' infer the svelte option props, building up from least valuable to most valuable information
  // WARNING: This object will be mutated to create the assembled options
  const props: InferredSvelteOptionProps = {};

  // 1. Information provided by the user via '<svelte:options>' is the most valuable,
  // we use what is provided and never overwrite it
  inferPropsFromSvelteOptions(props, svelteOptions);

  if (propsDeclaration) {
    // 2. If the user uses TypeScript & we have types available, they are the next valuable information we can infer
    // we want to preferrably use them over what is being destructured
    // since the destructuring might use {...rest} or not destructure at all
    inferPropsFromTypes(props, propsDeclaration, typeDeclarations);

    // 3. Finally, we use prop declaration javascript destructuring to at least infer the props' names
    inferPropsFromComponentPropDeclaration(props, propsDeclaration);
  }

  return {
    tagName:
      svelteOptions?.stringFormTag?.value ??
      svelteOptions?.customElementOptions?.tag ??
      null,
    props,
    svelteOptions,
    // the instance script's content starts right after its opening tag's `>`
    scriptContentStart: instance ? code.indexOf(">", instance.start) + 1 : null,
    hasPropsDeclaration: propsDeclaration !== undefined,
    metadata: buildMetadata(
      code,
      root,
      props,
      propsDeclaration,
      typeDeclarations,
    ),
  };
};

/**
 * Assembles the documented public surface, merging what was inferred from the
 * code with what the author documented in JSDoc. Documentation only ever adds
 * description text or declares a member the scan could not see — it never
 * overrides an inferred attribute name, type or reflection setting.
 */
const buildMetadata = (
  code: string,
  root: ReturnType<typeof parse>,
  inferredProps: InferredSvelteOptionProps,
  propsDeclaration: TypedVariableDeclarator | undefined,
  typeDeclarations: TypeDeclaration[],
): ComponentMetadata => {
  const { description, tags } = extractComponentDescription(root["fragment"]);
  const propDocs = extractPropDocs(code, propsDeclaration, typeDeclarations);
  const propDefaults = extractPropDefaults(code, propsDeclaration);

  const props: PropMetadata[] = Object.entries(inferredProps).map(
    ([name, prop]) => {
      const docs = propDocs.get(name);
      const propertyOnly = prop.isNonSerializable === true;
      return {
        name,
        ...(propertyOnly ? {} : { attribute: prop.attributeName }),
        reflects: prop.isReflected === true,
        ...(propertyOnly ? {} : { type: prop.type }),
        ...(docs?.typeText ? { typeText: docs.typeText } : {}),
        ...(docs?.description ? { description: docs.description } : {}),
        ...(propDefaults.has(name) ? { default: propDefaults.get(name) } : {}),
        propertyOnly,
        optional: docs?.optional ?? propDefaults.has(name),
      };
    },
  );

  const tagValues = (tag: string) =>
    tags.filter((entry) => entry.tag === tag).map((entry) => entry.value);

  return {
    ...(description ? { description } : {}),
    props,
    slots: mergeDocumented(
      extractSlots(root["fragment"]),
      // `@slot name - description`; the default slot is documented as `@slot -`
      tagValues("slot"),
      (name): SlotMetadata => ({ name }),
    ),
    events: mergeDocumented(
      extractEvents(code, root),
      // `@event name - description`
      tagValues("event"),
      (name) => ({ name }),
    ),
    cssProperties: mergeDocumented(
      extractCssProperties(root["css"]),
      // both spellings are in common use across the custom elements ecosystem
      [...tagValues("cssprop"), ...tagValues("cssproperty")],
      (name): CssPropertyMetadata => ({ name }),
    ),
    localTypes: extractLocalTypes(code, typeDeclarations),
    imports: extractTypeImports(code, root["instance"]),
  };
};
