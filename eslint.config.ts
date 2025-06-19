// eslint.config.js

import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import tailwindcss from "eslint-plugin-tailwindcss";

export default [
  js.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname, // ✅ ensures baseUrl works
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },

  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react,
      tailwindcss,
    },
    rules: {
      ...react.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Next.js
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/no-custom-classname": "off",
      "no-console": "warn",
    },
  },

  {
    ignores: ["node_modules/**", ".next/**", "dist/**"],
  },
];
