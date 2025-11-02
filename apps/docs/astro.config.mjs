// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "svebcomponents",
      logo: {
        light: "/src/assets/svebcomponents_logo.svg",
        dark: "/src/assets/svebcomponents_logo.svg",
        replacesTitle: false,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/svebcomponents/svebcomponents",
        },
      ],
      sidebar: [
        {
          label: "Documentation",
          items: [
            // Each item here is one entry in the navigation menu.
            { label: "Getting Started", slug: "getting-started" },
          ],
        },
      ],
    }),
  ],
});
