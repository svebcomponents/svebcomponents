import type { SsrPrepare } from "@svebcomponents/ssr";

const prepare: SsrPrepare = ({ props, setProperty }) => {
  // Returning synchronously preserves the sync fast path when callers already
  // supplied the prepared value.
  if (props.prepared !== undefined) return;

  return Promise.resolve().then(() => {
    setProperty("prepared", { source: "adjacent server module" });
  });
};

export default prepare;
