import { Suspense } from "react";

import { CustomElement } from "@svebcomponents/ssr-react/rsc";

/**
 * The streaming case: the element resolves *after* the shell has been flushed,
 * so its markup arrives in one of React's out-of-order `<div hidden>` payloads
 * and is relocated into place by React's inline runtime.
 *
 * This is the shape Next pushes app authors towards, and the one that decides
 * whether declarative shadow DOM survives streaming at all: the parser only
 * adopts a `<template shadowrootmode>` while parsing, so if React moved the
 * element after its template had been consumed — or moved a template the
 * parser never adopted — the shadow root would be missing.
 */
export const dynamic = "force-dynamic";

const SlowElement = async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return (
    <CustomElement tag="simple-component" title="RSC Streamed" count="7" enabled="" />
  );
};

export default function RscAsyncStreamedPage() {
  return (
    <div id="app">
      <Suspense fallback={<p id="fallback">loading</p>}>
        <SlowElement />
      </Suspense>
    </div>
  );
}
