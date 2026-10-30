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
  // A function reads in steps, a blank line between them: a guard (`if`)
  // ends its step, and the result (`return`) is a step of its own. A guard
  // may sit right under the value it checks.
  {
    files: ["app/editor/**/*.{ts,tsx}", "app/office/**/*.{ts,tsx}"],
    rules: {
      "padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "return" },
        { blankLine: "always", prev: "if", next: "*" },
        { blankLine: "any", prev: "if", next: "if" },
      ],
      // Names say what they hold: no one-letter names but coordinates,
      // loop counters and the translation helpers.
      "id-length": ["error", { min: 2, exceptions: ["x", "y", "z", "i", "j", "t", "tn", "_"] }],
      "object-shorthand": "error",
      "prefer-template": "error",
      "arrow-body-style": ["error", "as-needed"],
      // Lead with the positive case; no `else` after a return.
      "no-negated-condition": "error",
      "no-else-return": ["error", { allowElseIf: false }],
      "no-lonely-if": "error",
      "no-useless-return": "error",
      eqeqeq: "error",
      // Shapes stay shallow: a named step instead of a nested ternary or a
      // fourth level of blocks, one options object instead of a long list.
      "no-nested-ternary": "error",
      "max-depth": ["error", 3],
      "max-params": ["error", 3],
    },
  },
  // A drawing API like the canvas one: coordinates read best positionally.
  {
    files: ["app/editor/plan/sketch.tsx"],
    rules: { "max-params": "off" },
  },
  // The editor's core knows nothing about offices: the office plugs in as a
  // module (app/office/, see office/module.ts), never the other way.
  {
    files: ["app/editor/**/*.{ts,tsx}"],
    // Tests may use the office's furniture as test pieces.
    ignores: ["app/editor/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/office", "**/office/**", "~/core/office/**", "~/utils/booking"],
              message:
                "The editor's core can't depend on the office: add a module slot instead (see app/editor/module.ts).",
            },
          ],
        },
      ],
    },
  },
]
