import { Suspense } from "react";

/**
 * A control with no custom element in it. If this route ever reports a
 * hydration error, the problem is in the harness or in Next itself, not in
 * anything svebcomponents emits — which is worth being able to tell apart
 * quickly, since every other streamed route asserts the same silence.
 */
export const dynamic = "force-dynamic";

const Slow = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return <p id="streamed">plain streamed content</p>;
};

export default function PlainStreamedPage() {
  return (
    <div id="app">
      <Suspense fallback={<p id="fallback">loading</p>}>
        <Slow />
      </Suspense>
    </div>
  );
}
