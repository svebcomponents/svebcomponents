import type { Plugin } from "rolldown";
import { parse, type AST } from "svelte/compiler";
import MagicString from "magic-string";

/**
 * Removes the `customElement` option from `<svelte:options>` in `.svelte`
 * files before the server compile.
 *
 * The SSR build compiles components with `customElement: false` — it renders
 * the component's shadow *content*, not a custom element. But if the source
 * declares `<svelte:options customElement={{ ... }}>`, Svelte treats the
 * component's `<style>` as belonging to a custom element's shadow root and
 * drops it entirely from the server render output (the compiler emits no
 * `css.add`). The result is server-rendered shadow DOM with scoped class
 * names but no `<style>` — a flash of unstyled content until the client
 * bundle injects the styles at hydration.
 *
 * Stripping `customElement` here lets the server compile treat the component
 * as ordinary and emit its CSS, which the SSR renderer then places inside the
 * declarative shadow root. The client build keeps `customElement` (that's
 * where the element is actually defined), so this only affects SSR output.
 */
export function pluginStripCustomElementOptions(): Plugin {
  return {
    name: "svebcomponents:strip-custom-element-options",

    transform(code, id) {
      if (!id.endsWith(".svelte")) return null;

      let options: AST.Root["options"];
      try {
        ({ options } = parse(code, { filename: id, modern: true }));
      } catch {
        // let the svelte plugin surface parse errors
        return null;
      }
      if (!options) return null;

      const customElement = options.attributes.find(
        (attr) => attr.name === "customElement",
      );
      if (!customElement) return null;

      const magicString = new MagicString(code);

      // If `customElement` is the only attribute, drop the whole tag;
      // otherwise remove just that attribute (and the space before it).
      if (options.attributes.length === 1) {
        magicString.remove(options.start, options.end);
      } else {
        const start = code.lastIndexOf(
          " ",
          (customElement as unknown as { start: number }).start,
        );
        magicString.remove(
          start === -1
            ? (customElement as unknown as { start: number }).start
            : start,
          (customElement as unknown as { end: number }).end,
        );
      }

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
