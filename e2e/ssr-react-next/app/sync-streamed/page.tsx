import { Suspense } from "react";

/**
 * The sync wrapper under streaming. Pairs with `/rsc-async-streamed`: the two
 * wrappers reach the DOM by different routes, and the declarative-shadow-root
 * race that streaming creates is a property of *when* markup is parsed, not of
 * which wrapper produced it, so both need covering.
 */
export const dynamic = "force-dynamic";

const SlowElement = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return <sync-component title="Sync Streamed" count="3" enabled="" />;
};

export default function SyncStreamedPage() {
  return (
    <div id="app">
      <Suspense fallback={<p id="fallback">loading</p>}>
        <SlowElement />
      </Suspense>
    </div>
  );
}
