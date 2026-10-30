import path from "node:path"
import { fileURLToPath } from "node:url"
import { fixupPluginRules } from "@eslint/compat"
import { FlatCompat } from "@eslint/eslintrc"
import js from "@eslint/js"
import typescriptEslint from "@typescript-eslint/eslint-plugin"
import _import from "eslint-plugin-import"
import prettier from "eslint-plugin-prettier"
import unusedImports from "eslint-plugin-unused-imports"
import globals from "globals"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
})

export default [
  // Generated code (Prisma client, `prisma generate`) — not ours to lint.
  { ignores: ["**/generated/**"] },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
      "unused-imports": unusedImports,
      import: fixupPluginRules(_import),
      prettier,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },
    },

    rules: {
      "prettier/prettier": "error",
      "unused-imports/no-unused-imports": "error",

      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],

      "eol-last": ["error", "always"],

      semi: ["error", "never"],

      "no-multiple-empty-lines": [
        "error",
        {
          max: 2,
          maxEOF: 1,
        },
      ],

      "keyword-spacing": ["error"],
      "key-spacing": ["error"],
      "space-in-parens": ["error"],
      "no-trailing-spaces": ["error"],
      eqeqeq: ["error"],
      "spaced-comment": ["error", "always", { markers: ["/"] }],
      yoda: ["error"],
      "no-mixed-spaces-and-tabs": ["error"],
      "space-infix-ops": ["error"],
      quotes: ["error"],
      "import/no-absolute-path": 2,
      "import/no-useless-path-segments": 2,
      "import/first": 2,
      "import/no-duplicates": 2,

      "import/order": [
        2,
        {
          "newlines-between": "never",
        },
      ],

      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // The editor's core knows nothing about offices: the office plugs in as a
  // module (OfficeEditor/office/, see office/module.ts), never the other way.
  {
    files: ["app/components/OfficeEditor/**/*.{ts,tsx}"],
    ignores: [
      "app/components/OfficeEditor/office/**",
      // The app's entry point: it loads the office's editor.
      "app/components/OfficeEditor/OfficeEditor.client.ts",
      // Tests may use the office's furniture as test pieces.
      "app/components/OfficeEditor/**/*.test.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/office", "**/office/**", "~/core/office/**", "~/utils/booking"],
              message:
                "The editor's core can't depend on the office: add a module slot instead (see editor/module.ts).",
            },
          ],
        },
      ],
    },
  },
]
