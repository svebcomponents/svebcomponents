/**
 * An asynchronous element written as a plain dashed tag in a Server Component,
 * with no `/rsc` import anywhere in the file.
 *
 * `simple-component` both awaits while rendering and has an async SsrPrepare
 * hook, so the synchronous wrapper cannot render it and degrades to
 * client-only. Reaching it here depends on the react-server export condition
 * swapping in the JSX runtime that routes tags through the async wrapper.
 */
export const dynamic = "force-dynamic";

export default function RscAsyncPlainTagPage() {
  return (
    <div id="app">
      <simple-component title="Plain Tag Async" count="5" enabled="" />
    </div>
  );
}
