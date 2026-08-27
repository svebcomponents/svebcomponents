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
        "Build typed, publishable, server-renderable web components with Svelte.",
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
            {
              label: "Why svebcomponents",
              slug: "introduction",
            },
            { label: "Quickstart", slug: "getting-started" },
          ],
        },
        {
          label: "Build a library",
          items: [
            { label: "Authoring components", slug: "authoring" },
            { label: "Configure package outputs", slug: "publishing" },
            { label: "Consumer types", slug: "guides/framework-types" },
          ],
        },
        {
          label: "Server rendering",
          items: [
            { label: "SSR Overview", slug: "server-rendering" },
            {
              label: "Framework Integrations",
              collapsed: false,
              items: [
                { label: "SvelteKit", slug: "server-rendering/sveltekit" },
                { label: "React", slug: "server-rendering/react" },
                { label: "Next.js", slug: "server-rendering/nextjs" },
                { label: "Vue", slug: "server-rendering/vue" },
                { label: "Astro", slug: "server-rendering/astro" },
              ],
            },
            { label: "Async components", slug: "server-rendering/async" },
          ],
        },
        {
          label: "How it works",
          collapsed: true,
          items: [
            { label: "Build pipeline", slug: "guides/build" },
            {
              label: "Attribute metadata",
              slug: "guides/attribute-inference",
            },
            { label: "Hydration", slug: "server-rendering/hydration" },
          ],
        },
        {
          label: "Reference",
          collapsed: true,
          items: [
            {
              label: "Configuration",
              slug: "guides/manual-configuration",
            },
            { label: "Compatibility", slug: "reference/compatibility" },
            { label: "Troubleshooting", slug: "reference/troubleshooting" },
            {
              label: "Package APIs",
              collapsed: true,
              items: [
                {
                  label: "@svebcomponents/build",
                  slug: "packages/build",
                },
                {
                  label: "@svebcomponents/auto-options",
                  slug: "packages/auto-options",
                },
                {
                  label: "@svebcomponents/ssr",
                  slug: "packages/ssr",
                },
              ],
            },
          ],
        },
        {
          label: "Releases",
          slug: "releases",
        },
      ],
    }),
  ],
});
