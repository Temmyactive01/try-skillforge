import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  /*
   * Build output. `dist` and `.netlify` are where the netlify preset writes
   * (the static site and the SSR handler); `.output` is the Cloudflare target,
   * still supported. Without `.netlify` here, `npm run lint` reports tens of
   * thousands of formatting problems in a generated bundle.
   */
  { ignores: ["dist", ".netlify", ".output", ".vinxi"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      /*
       * Nothing in the app may use a native browser dialog. They ignore the
       * design system, can't be styled, block the page, and read badly on a
       * phone. Confirmations use the kit's AlertDialog, messages use the
       * toast. This catches alert(), confirm() and prompt().
       */
      "no-alert": "error",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  eslintPluginPrettier,
);
