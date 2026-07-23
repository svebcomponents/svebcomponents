import type { Plugin, PluginContext } from "rolldown";
import MagicString from "magic-string";

/**
 * Whenever a component compiles with a tag (either
 * `<svelte:options customElement="tag" />` or the object form's `tag:`
 * property), Svelte's own compiler auto-generates an *unguarded*
 * `customElements.define(tag, ...)` call at module scope — it throws if the
 * same compiled module is ever evaluated more than once (two bundles of the
 * same page, or a page that imports the client package both for browser
 * registration and via a generated SSR entry).
 *
 * This wraps that exact call in place with an idempotency guard, reusing
 * Svelte's own arguments verbatim — it never needs to know the tag value or
 * reconstruct a class reference, since Svelte already got both right.
 *
 * Runs as a `renderChunk` hook (not `transform`): a per-module `transform`
 * hook that both calls `this.parse()` and returns a `MagicString`-spliced
 * result was empirically confirmed (against this repo's own build) to
 * compute the correct output but not have it survive into the final
 * bundle — `renderChunk` operates on the already-bundled chunk text right
 * before it's written out, which is the standard, reliably-respected hook
 * for this kind of final text post-processing.
 *
 * Scoped to the client build only. The SSR build compiles with
 * `customElement: false` and never emits this call at all — unrelated to
 * `@svebcomponents/ssr`'s `pluginStripCustomElementOptions`, which strips the
 * whole `customElement` option before the *server* compile for a different
 * reason (so `$host()`'s compile-time requirement doesn't leak into it).
 */
export const pluginGuardCustomElementDefine = (): Plugin => ({
  name: "svebcomponents:guard-custom-element-define",

  renderChunk(code) {
    let ast: ReturnType<PluginContext["parse"]>;
    try {
      ast = this.parse(code);
    } catch {
      // not parseable JS (shouldn't happen for a bundled chunk) — leave untouched
      return null;
    }

    const magicString = new MagicString(code);
    let matchIndex = 0;

    for (const statement of ast.body) {
      if (statement.type !== "ExpressionStatement") continue;
      const expression = statement.expression;
      if (expression.type !== "CallExpression") continue;
      const callee = expression.callee;
      if (
        callee.type !== "MemberExpression" ||
        callee.computed ||
        callee.object.type !== "Identifier" ||
        callee.object.name !== "customElements" ||
        callee.property.type !== "Identifier" ||
        callee.property.name !== "define"
      ) {
        continue;
      }
      const [tagArg, ...restArgs] = expression.arguments;
      if (!tagArg) continue;

      const tagArgSource = code.slice(tagArg.start, tagArg.end);

      // Svelte's second argument (a `create_custom_element(...)` call) has
      // an observable side effect this module depends on beyond
      // registration: it sets `Component.element`. `||` short-circuiting
      // would skip evaluating it entirely once the tag is already
      // registered elsewhere (e.g. by a different module instance of the
      // same component), silently breaking `.element` for *this* module —
      // so its evaluation is hoisted out of the guarded branch, ensuring it
      // always runs exactly once per module evaluation, while only the
      // actual `customElements.define()` call itself is guarded.
      let hoisted = "";
      const replacementArgs = restArgs.map((arg, argIndex) => {
        const varName = `__svebcomponentsCeArg${matchIndex}_${argIndex}`;
        hoisted += `const ${varName} = ${code.slice(arg.start, arg.end)};\n`;
        return varName;
      });
      matchIndex += 1;

      if (hoisted) {
        magicString.appendLeft(statement.start, hoisted);
      }
      magicString.overwrite(
        expression.start,
        expression.end,
        `customElements.get(${tagArgSource}) || customElements.define(${tagArgSource}${
          replacementArgs.length ? `, ${replacementArgs.join(", ")}` : ""
        })`,
      );
    }

    if (!magicString.hasChanged()) {
      return null;
    }

    return {
      code: magicString.toString(),
      map: magicString.generateMap({ includeContent: true }),
    };
  },
});

export default pluginGuardCustomElementDefine;
