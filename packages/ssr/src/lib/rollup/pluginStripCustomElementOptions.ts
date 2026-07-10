import type { Plugin } from "rolldown";
import { parse, type AST } from "svelte/compiler";
import MagicString from "magic-string";
import { walk } from "zimmerframe";

/**
 * Makes custom-element-authored `.svelte` source compile as a plain component
 * for the server build, by removing the two constructs Svelte only accepts
 * (or only handles correctly) in a `customElement` compile:
 *
 * 1. The `customElement` option in `<svelte:options>`. The SSR build compiles
 *    with `customElement: false` — it renders the component's shadow
 *    *content*, not a custom element. But if the source declares
 *    `<svelte:options customElement={{ ... }}>`, Svelte treats the
 *    component's `<style>` as belonging to a custom element's shadow root and
 *    drops it entirely from the server render output (the compiler emits no
 *    `css.add`). The result is server-rendered shadow DOM with scoped class
 *    names but no `<style>` — a flash of unstyled content until the client
 *    bundle injects the styles at hydration.
 *
 * 2. `$host()` calls. Svelte hard-errors (`host_invalid_placement`) on
 *    `$host()` unless the compile is a custom-element compile — which, per
 *    the above, the server compile deliberately is not. Svelte's own server
 *    transform compiles `$host()` to `void 0`, so replacing the calls with
 *    `undefined` here is behavior-identical: `$host()` returns the host
 *    element on the client and `undefined` during SSR, where no host element
 *    exists. (On the client, the hydration host passes the custom element
 *    through as `$$props.$$host`, so `$host()` works after hydration.)
 *
 * The client build keeps both constructs (that's where the element is
 * actually defined), so this only affects SSR output.
 *
 * Runs on raw source, before the svelte plugin. Svelte's parser handles
 * TypeScript natively; sources needing other preprocessing that fails the
 * parse are passed through untouched and surface their errors downstream.
 */
export function pluginStripCustomElementOptions(): Plugin {
  return {
    name: "svebcomponents:strip-custom-element-options",

    transform(code, id) {
      if (!id.endsWith(".svelte")) return null;

      let root: AST.Root;
      try {
        root = parse(code, { filename: id, modern: true });
      } catch {
        // let the svelte plugin surface parse errors
        return null;
      }

      let edited = false;
      const magicString = new MagicString(code);

      const options = root.options;
      const customElement = options?.attributes.find(
        (attr) => attr.name === "customElement",
      );
      if (options && customElement) {
        edited = true;
        // If `customElement` is the only attribute, drop the whole tag;
        // otherwise remove just that attribute (and the space before it).
        if (options.attributes.length === 1) {
          magicString.remove(options.start, options.end);
        } else {
          const attributeSpan = customElement as unknown as {
            start: number;
            end: number;
          };
          const start = code.lastIndexOf(" ", attributeSpan.start);
          magicString.remove(
            start === -1 ? attributeSpan.start : start,
            attributeSpan.end,
          );
        }
      }

      // Replace `$host()` calls everywhere they can appear (instance script
      // and template expressions). `$`-prefixed names are reserved for runes,
      // so a `$host` callee is always the rune — it cannot be shadowed.
      walk(root as unknown as { type: string }, null, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the walked tree mixes svelte AST and estree nodes
        CallExpression(node: any, context: { next: () => void }) {
          if (
            node.callee?.type === "Identifier" &&
            node.callee.name === "$host" &&
            typeof node.start === "number" &&
            typeof node.end === "number"
          ) {
            edited = true;
            magicString.overwrite(node.start, node.end, "undefined");
            // `$host()` takes no arguments — nothing left to visit inside
            return;
          }
          context.next();
        },
      });

      if (!edited) return null;

      return {
        code: magicString.toString(),
        map: magicString.generateMap({
          source: id,
          file: id,
          includeContent: true,
        }),
      };
    },
  };
}
