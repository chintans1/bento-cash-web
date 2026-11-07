import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { databaseWorkerForMode } from "./cloudflare.config.js";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";

export default defineConfig(({ mode }) => ({
  // PDF.js is loaded only when a user selects a statement. Keeping it out of
  // Vite's prebundled dependency cache avoids stale module URLs in an already
  // running dev server after the package is added or updated.
  optimizeDeps: { exclude: ["pdfjs-dist"] },
  plugins: [
    vinext({
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      auxiliaryWorkers: [{ config: databaseWorkerForMode(mode) }],
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
}));
