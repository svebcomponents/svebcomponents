// Shared between the client wrapper component and its tests — must therefore
// not import anything svelte-client- or svelte-server-specific.

/**
 * Whether a wrapper prop has to be assigned as a JavaScript property rather
 * than travel through the client wrapper's attribute spread.
 *
 * Svelte compiles a `<svelte:element>` spread to `set_attributes`, which — for
 * an element in the HTML namespace — runs every key through
 * `normalize_attribute`, whose first step is `name.toLowerCase()`. That is
 * correct for real HTML elements, whose attribute names are ASCII
 * case-insensitive, but a custom element's props are case-*sensitive*: a
 * lowercased `showRoot` matches neither the element's observed attribute
 * (`show-root`) nor its `showRoot` setter, so the value is silently dropped
 * and the prop keeps its default.
 *
 * `<svelte:element>` cannot avoid that path. Its tag name is only known at
 * runtime, so svelte compiles even statically-named attributes on it to
 * `attribute_effect` (the spread path) rather than to the case-preserving
 * `set_custom_element_data` it uses for a compile-time-known custom element.
 * The wrapper therefore has to set these props itself.
 *
 * The rule: a name containing an uppercase letter has no HTML attribute
 * representation at all, so nothing is lost by routing it to the property
 * path — and every all-lowercase name (`class`, `style`, `id`, `slot`,
 * `part`, `data-*`, `aria-*`, kebab-case attributes) keeps its existing
 * behaviour, including svelte's class/style handling and event delegation.
 * `on*` keys are excluded regardless of case so that event handlers always
 * stay with svelte's own listener handling.
 *
 * This mirrors what the server wrapper already does: `startRender` routes
 * every non-kebab-case key to `setProperty`, so a server-rendered element and
 * a client-rendered one now receive the same props.
 *
 * Svelte 6 TODO (#8): delete this module and go back to a plain `{...props}`
 * spread in Client.svelte once `set_attributes` stops lowercasing prop names
 * on custom elements — filed upstream as sveltejs/svelte#16590, whose
 * suggested fix is to consult the element's setters before reaching for
 * `normalize_attribute`. Nothing else here depends on the partition, so the
 * revert is the wrapper's two lines plus this file.
 */
export const mustBeSetAsProperty = (name: string): boolean =>
  /[A-Z]/.test(name) && !name.startsWith("on");

export interface PartitionedProps {
  /** props that can safely travel as HTML attributes */
  attributes: Record<string, unknown>;
  /** props that have to be assigned as JavaScript properties */
  properties: Record<string, unknown>;
}

/**
 * Splits a wrapper's prop bag along {@link mustBeSetAsProperty}.
 *
 * Key order is preserved within each half, so the attribute half spreads onto
 * the element in the order the host authored it.
 */
export const partitionProps = (
  props: Record<string, unknown>,
): PartitionedProps => {
  const attributes: Record<string, unknown> = {};
  const properties: Record<string, unknown> = {};

  for (const name of Object.keys(props)) {
    if (mustBeSetAsProperty(name)) {
      properties[name] = props[name];
    } else {
      attributes[name] = props[name];
    }
  }

  return { attributes, properties };
};
