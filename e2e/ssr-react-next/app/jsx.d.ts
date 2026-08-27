import type { ReactNode } from "react";

// the custom elements these routes render, so JSX type-checks without `any`
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "sync-component": {
        title?: string;
        count?: string;
        enabled?: string;
        meta?: { note: string };
        children?: ReactNode;
      };
      "simple-component": {
        title?: string;
        count?: string;
        enabled?: string;
        children?: ReactNode;
      };
    }
  }
}
