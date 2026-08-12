import { isBuiltin } from "node:module";

/**
 * Decides what a browser build inlines.
 *
 * tsdown's default is to externalize whatever `package.json` lists in
 * `dependencies` and `peerDependencies`. That classification answers "what must
 * the consumer install", which is a different question from "what must be in
 * this file". For output that is loaded from a URL — no import map, no resolver
 * — the two only coincide by luck, and every time they diverged the build wrote
 * a bundle no browser could load and reported success.
 *
 * So the browser builds state the contract directly instead of inferring it:
 * every bare specifier is inlined. What a package declares is then free to mean
 * what it actually means, which is what its consumers must install.
 *
 * Left external:
 *
 * - Node builtins. A browser bundle importing `node:fs` is broken either way,
 *   and inlining one turns a dependency's dead branch into a build error.
 * - Relative and absolute paths, and virtual modules. Those are the bundler's
 *   own graph rather than dependencies.
 * - Protocol imports (`data:`, `https:`) — not resolvable to a file.
 * - Anything the package opted out of explicitly.
 *
 * A specifier that is inlined but cannot be resolved now fails the build, which
 * is the point: this class of mistake used to be silent.
 */
export const createBrowserBundlingRule =
  (neverBundle: readonly (string | RegExp)[] = []) =>
  (id: string): boolean => {
    if (isBuiltin(id)) return false;
    // `\0` prefixes plugin-virtual modules; a bare protocol has no file to bundle
    if (id.startsWith(".") || id.startsWith("/") || id.startsWith("\0")) {
      return false;
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(id)) return false;
    return !neverBundle.some((pattern) => {
      if (typeof pattern === "string") return pattern === id;

      // RegExp.prototype.test mutates lastIndex for global and sticky patterns.
      // Test a fresh instance so a bundler asking about the same id repeatedly
      // always receives the same answer, without modifying the caller's regex.
      return new RegExp(pattern.source, pattern.flags).test(id);
    });
  };
