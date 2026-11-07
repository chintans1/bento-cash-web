import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { databaseWorker } from "./cloudflare.config.js";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";

export default defineConfig({
  // PDF.js is loaded only when a user selects a statement. Keeping it out of
  // Vite's prebundled dependency cache avoids stale module URLs in an already
  // running dev server after the package is added or updated.
  optimizeDeps: { exclude: ["pdfjs-dist"] },
  plugins: [
    vinext({
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      auxiliaryWorkers: [{ config: databaseWorker }],
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
