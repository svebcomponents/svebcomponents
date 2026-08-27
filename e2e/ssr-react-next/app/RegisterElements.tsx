"use client";

/**
 * Loads the component package's browser entry, which is what calls
 * `customElements.define` and lets each element upgrade and hydrate itself
 * from its server-rendered shadow root.
 *
 * Next has no client entry file, so this has to be a Client Component pulled
 * into the tree. Importing the package from a Server Component instead would
 * only register the elements on the server, where `instrumentation.ts` already
 * does it — the page would still show server-rendered shadow content, and
 * nothing would ever become interactive.
 */
import "@svebcomponents/e2e.ssr";
import "@svebcomponents/e2e.ssr/sync";

export default function RegisterElements() {
  return null;
}
