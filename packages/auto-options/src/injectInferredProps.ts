import type MagicString from "magic-string";
import type { InferredSvelteOptionProps } from "./types";
import type { SvelteOptions } from "./extractSvelteOptionsProps";

/**
 * The identifiers the hydration wrapper and host component are imported as.
 * Prefixed to make collisions with user code practically impossible.
 */
export const HYDRATABLE_IDENTIFIER = "__svebcomponentsHydratable";
export const HYDRATION_HOST_IDENTIFIER = "__svebcomponentsHydrationHost";

export interface InjectionOptions {
  /**
   * When set, `extend: __svebcomponentsHydratable` is injected into the
   * custom element options (unless the user already provides an `extend`),
   * together with its import. `scriptContentStart` must point right after
   * the instance `<script ...>` tag's closing `>`.
   */
  hydratable?: { scriptContentStart: number } | undefined;
}

export const injectInferredProps = (
  inferredProps: InferredSvelteOptionProps,
  svelteOptions: SvelteOptions | null,
  magicString: MagicString,
  { hydratable }: InjectionOptions = {},
) => {
  // non-serializable props (functions, snippets) are omitted from the generated props,
  // svelte then exposes them as plain JS properties without any attribute handling
  const serializableProps = Object.entries(inferredProps).filter(
    ([, inferredProp]) => !inferredProp.isNonSerializable,
  );

  // if the user already declared `<svelte:options customElement="tagName"/>` (the currently
  // unsupported string variant), a `customElement` attribute is already present on svelte:options.
  // We must not inject a second `customElement={{...}}` attribute, since that would be a Svelte
  // compile error, so we leave svelte:options untouched entirely.
  if (svelteOptions?.hasUnsupportedStringCustomElement) return;

  const shouldInjectExtend =
    hydratable !== undefined && !svelteOptions?.customElementOptions?.hasExtend;

  let inferredPropsResult: string | null = null;
  if (serializableProps.length > 0) {
    inferredPropsResult = "props: {\n";
    for (const [propName, inferredProp] of serializableProps) {
      inferredPropsResult += `${propName}: {attribute: "${inferredProp.attributeName}", reflect: ${inferredProp.isReflected}, type: "${inferredProp.type}"},\n`;
    }
    inferredPropsResult += "}";
  }

  // the host component is passed in (rather than imported by the wrapper) to
  // avoid a circular import between the hydration runtime and the host
  const extendResult = shouldInjectExtend
    ? `extend: (ceClass) => ${HYDRATABLE_IDENTIFIER}(ceClass, ${HYDRATION_HOST_IDENTIFIER})`
    : null;

  if (inferredPropsResult === null && extendResult === null) return;

  if (extendResult !== null && hydratable !== undefined) {
    magicString.appendLeft(
      hydratable.scriptContentStart,
      `\nimport { hydratable as ${HYDRATABLE_IDENTIFIER} } from "@svebcomponents/ssr/hydration";\nimport ${HYDRATION_HOST_IDENTIFIER} from "@svebcomponents/ssr/hydration-host";\n`,
    );
  }

  // 1: custom element options already exist on svelte:options
  if (svelteOptions?.customElementOptions) {
    const { propertyInjectIndex, lastPropertyEnd, props } =
      svelteOptions.customElementOptions;
    // an appended entry needs a leading comma only when the object has
    // properties AND doesn't already end in a trailing comma — otherwise
    // we'd emit `..., , extend` (a parse error) or `...} extend` (missing
    // separator). A single leading comma covers all appended entries since
    // each appended entry ends without one.
    let appendSeparator =
      lastPropertyEnd > 0 &&
      !magicString.original
        .slice(lastPropertyEnd, propertyInjectIndex)
        .includes(",")
        ? ",\n"
        : "\n";
    const append = (entry: string) => {
      magicString.appendLeft(
        propertyInjectIndex,
        `${appendSeparator}${entry},`,
      );
      appendSeparator = "\n";
    };
    if (inferredPropsResult !== null) {
      if (props) {
        // 1-a: prop options exist, replace only them with the inferred props
        magicString.overwrite(
          props.propsStart,
          props.propsEnd,
          inferredPropsResult,
        );
      } else {
        // 1-b: no prop options yet, append the prop options
        append(inferredPropsResult);
      }
    }
    if (extendResult !== null) {
      append(extendResult);
    }
    return;
  }

  const customElementBody = [inferredPropsResult, extendResult]
    .filter((entry) => entry !== null)
    .join(",\n");
  const customElementAttribute = ` customElement={{\n${customElementBody}\n}} `;

  // 2: svelte options exist, but no custom element options — inject them onto svelte:options
  if (svelteOptions) {
    magicString.appendLeft(
      svelteOptions.attributeInjectIndex,
      customElementAttribute,
    );
    return;
  }

  // 3: no svelte options exist, inject svelte:options
  magicString.prepend(`<svelte:options${customElementAttribute}/>\n`);
};
