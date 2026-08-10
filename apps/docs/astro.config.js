import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

import { remarkStripLeadingH1 } from "./src/plugins/remarkStripLeadingH1.js";

// https://astro.build/config
export default defineConfig({
  site: "https://svebcomponents.dev",
  markdown: {
    remarkPlugins: [remarkStripLeadingH1],
  },
  integrations: [
    starlight({
      title: "svebcomponents",
      description:
        "Build Svelte components into web components that package themselves, describe themselves to other people's editors, and server-render with real hydration.",
      customCss: ["./src/styles/custom.css"],
      routeMiddleware: "./src/starlightRouteData.ts",
      logo: {
        light: "/src/assets/svebcomponents_logo.svg",
        dark: "/src/assets/svebcomponents_logo.svg",
        replacesTitle: false,
      },
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://svebcomponents.dev/og.png",
          },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:width", content: "1200" },
        },
        {
          tag: "meta",
          attrs: { property: "og:image:height", content: "630" },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://svebcomponents.dev/og.png",
          },
        },
      ],
      editLink: {
        baseUrl:
          "https://github.com/svebcomponents/svebcomponents/edit/main/apps/docs/",
      },
      lastUpdated: true,
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/svebcomponents/svebcomponents",
        },
      ],
      sidebar: [
        {
          label: "Start here",
          items: [
            { label: "What is svebcomponents?", slug: "introduction" },
            { label: "Getting Started", slug: "getting-started" },
            { label: "Authoring components", slug: "authoring" },
            { label: "Publishing your package", slug: "publishing" },
          ],
        },
        {
          label: "Server rendering",
          items: [
            { label: "Overview", slug: "server-rendering" },
            { label: "Hydration", slug: "server-rendering/hydration" },
            {
              label: "Other frameworks",
              slug: "server-rendering/other-frameworks",
            },
          ],
        },
        {
          label: "Guides",
          collapsed: true,
          items: [
            { label: "How the build works", slug: "guides/build" },
            {
              label: "How attribute inference works",
              slug: "guides/attribute-inference",
            },
            {
              label: "Typing elements in React & Vue",
              slug: "guides/framework-types",
            },
            {
              label: "Manual configuration",
              slug: "guides/manual-configuration",
            },
          ],
        },
        {
          label: "Reference",
          collapsed: true,
          items: [
            { label: "Compatibility", slug: "reference/compatibility" },
            { label: "Troubleshooting", slug: "reference/troubleshooting" },
            { label: "@svebcomponents/build", slug: "packages/build" },
            {
              label: "@svebcomponents/auto-options",
              slug: "packages/auto-options",
            },
            { label: "@svebcomponents/ssr", slug: "packages/ssr" },
            {
              label: "SSR integrations",
              collapsed: true,
              items: [
                {
                  label: "@svebcomponents/ssr-vue",
                  slug: "packages/ssr-vue",
                },
                {
                  label: "@svebcomponents/ssr-react",
                  slug: "packages/ssr-react",
                },
                {
                  label: "@svebcomponents/ssr-astro",
                  slug: "packages/ssr-astro",
                },
              ],
            },
            { label: "@svebcomponents/utils", slug: "packages/utils" },
          ],
        },
        {
          label: "Changelog",
          collapsed: true,
          items: [
            { label: "@svebcomponents/build", slug: "changelog/build" },
            {
              label: "@svebcomponents/auto-options",
              slug: "changelog/auto-options",
            },
            { label: "@svebcomponents/ssr", slug: "changelog/ssr" },
            { label: "@svebcomponents/utils", slug: "changelog/utils" },
          ],
        },
      ],
    }),
  ],
});
