import { defineConfig } from "astro/config";
import svebcomponents from "@svebcomponents/ssr-astro";

// The app-author configuration this suite exercises: the integration alone,
// with no other setup.
export default defineConfig({
  integrations: [svebcomponents()],
});
