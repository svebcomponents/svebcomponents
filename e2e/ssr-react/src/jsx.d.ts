import type { ReactNode } from "react";

// the custom elements this suite renders, so JSX type-checks without `any`
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

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "unregistered-element": { children?: ReactNode };
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "lit-counter": {
        label?: string;
        count?: string;
        children?: ReactNode;
      };
    }
  }
}
