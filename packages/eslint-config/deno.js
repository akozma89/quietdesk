import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";
import globals from "globals";
import { config as baseConfig } from "./base.js";

/**
 * A custom ESLint configuration for Deno-based projects (like Supabase Edge Functions).
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const denoConfig = [
  ...baseConfig,
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        Deno: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
  {
    rules: {
      // Deno-specific rules
      "import/no-unresolved": "off", // Deno handles imports differently
      "no-undef": "off", // Deno globals are not recognized by ESLint
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }],
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", ".turbo/**"],
  },
];
