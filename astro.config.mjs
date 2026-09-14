import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://ripusudan-vishwakarma.github.io/tech-blog",
  base: "/tech-blog/",
  integrations: [mdx(), sitemap()]
});