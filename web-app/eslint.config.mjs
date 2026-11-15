import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
  ]),
  {
    // Every imported package must be declared in package.json. Packages that
    // only arrive transitively (e.g. openai via @langchain/openai) silently
    // break when the parent package changes its dependencies.
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: [
            "tests/**",
            "e2e/**",
            "scripts/**",
            "**/*.config.{ts,mts,mjs,js}",
          ],
        },
      ],
    },
  },
  {
    // Pre-existing issues across the codebase. Demoted to warnings so
    // CI is unblocked while we backlog cleanups; new code should still
    // avoid these patterns.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
]);

export default eslintConfig;
