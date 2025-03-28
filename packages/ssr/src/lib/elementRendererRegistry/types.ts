import { ElementRenderer } from "@lit-labs/ssr";

export interface ElementRendererCtor {
  new (): ElementRenderer;
}
