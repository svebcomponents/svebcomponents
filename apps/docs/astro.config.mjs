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
            { label: "Introduction", slug: "introduction" },
            { label: "Getting Started", slug: "getting-started" },
            { label: "Core Concepts", slug: "core-concepts" },
          ],
        },
        {
          label: "Packages",
          items: [
            { label: "@svebcomponents/build", slug: "packages/build" },
            {
              label: "@svebcomponents/auto-options",
              slug: "packages/auto-options",
            },
            { label: "@svebcomponents/ssr", slug: "packages/ssr" },
            { label: "@svebcomponents/utils", slug: "packages/utils" },
          ],
        },
        {
          label: "Maintainers",
          items: [
            {
              label: "Internal Config Packages",
              slug: "maintainers/config-packages",
            },
          ],
        },
        {
          label: "Migration",
          items: [
            {
              label: "@svebcomponents/build",
              slug: "migration/build",
            },
            {
              label: "@svebcomponents/auto-options",
              slug: "migration/auto-options",
            },
            {
              label: "@svebcomponents/ssr",
              slug: "migration/ssr",
            },
            {
              label: "@svebcomponents/utils",
              slug: "migration/utils",
            },
          ],
        },
      ],
    }),
  ],
});
