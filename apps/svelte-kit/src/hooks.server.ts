// add web component shims
import { ElementRendererRegistry } from "@svebcomponents/ssr";
import ExampleComponentRenderer from "@svebcomponents/example-component/ssr";
import type { Handle } from "@sveltejs/kit";

ElementRendererRegistry.set("example-component", ExampleComponentRenderer);

export const handle: Handle = async ({ event, resolve }) => {
  return await resolve(event);
};
