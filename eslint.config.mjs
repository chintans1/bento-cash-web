import js from "@eslint/js";
import { plugin as shadcn } from "@shadcn/lint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  {
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "react/prop-types": "off",
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    // Keep registry components upstream; apply design policies to app code.
    ignores: ["components/ui/**"],
    plugins: { shadcn },
    rules: {
      "shadcn/no-raw-colors": "error",
      "shadcn/no-arbitrary-values": "error",
      "shadcn/no-inline-styles": "error",
      "shadcn/no-unknown-classes": "error",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
  prettier,
  globalIgnores([
    ".next/**",
    ".vinext/**",
    ".cloudflare/**",
    "dist/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
