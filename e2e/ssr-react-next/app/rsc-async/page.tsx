import { CustomElement } from "@svebcomponents/ssr-react/rsc";

/**
 * The async path, awaited inside the page's own server component so the whole
 * document is flushed as one chunk. `simple-component` awaits while rendering
 * *and* has an async `SsrPrepare` hook.
 */
export const dynamic = "force-dynamic";

export default function RscAsyncPage() {
  return (
    <div id="app">
      <CustomElement tag="simple-component" title="RSC Async" count="5" enabled="" />
    </div>
  );
}
