/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "next",
    "next/core-web-vitals",
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:tailwindcss/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint", "react", "tailwindcss"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: "./tsconfig.json",
  },
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn"],
    "react/react-in-jsx-scope": "off", // Next.js doesn't need React import
    "tailwindcss/classnames-order": "warn",
    "tailwindcss/no-custom-classname": "off", // set to "warn" if strict naming,
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "no-console": "warn",
  },
};
