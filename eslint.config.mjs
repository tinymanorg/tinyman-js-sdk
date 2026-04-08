import path from "path";
import {fileURLToPath} from "url";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import-x";
import globals from "globals";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ["dist/**/*", "examples/**/*", "eslint.config.mjs"]
  },
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    plugins: {
      "import-x": importPlugin
    },
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.es2015
      },
      parserOptions: {
        project: path.resolve(__dirname, "./tsconfig.json"),
        tsconfigRootDir: __dirname
      }
    },
    settings: {
      "import-x/resolver": {
        typescript: {}
      }
    },
    rules: {
      // === Best practices (from @hipo/eslint-config-base) ===
      "accessor-pairs": "error",
      "array-callback-return": "error",
      "block-scoped-var": "error",
      "complexity": ["warn", {max: 20}],
      "consistent-return": "error",
      "curly": "error",
      "default-case": "error",
      "dot-notation": "error",
      "guard-for-in": "error",
      "no-alert": "error",
      "no-caller": "error",
      "no-div-regex": "error",
      "no-else-return": "error",
      "no-empty-function": "error",
      "no-eval": "error",
      "no-extend-native": "error",
      "no-extra-bind": "error",
      "no-extra-label": "error",
      "no-implicit-coercion": ["error", {boolean: false}],
      "no-implicit-globals": "error",
      "no-implied-eval": "error",
      "no-iterator": "error",
      "no-labels": "error",
      "no-lone-blocks": "error",
      "no-loop-func": "error",
      "no-multi-str": "error",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "no-new": "error",
      "no-octal-escape": "error",
      "no-param-reassign": "error",
      "no-proto": "error",
      "no-script-url": "error",
      "no-self-compare": "error",
      "no-sequences": "error",
      "no-throw-literal": "error",
      "no-unmodified-loop-condition": "error",
      "no-unused-expressions": "error",
      "no-useless-call": "error",
      "no-useless-concat": "error",
      "no-useless-return": "error",
      "no-void": "error",
      "prefer-promise-reject-errors": ["error", {allowEmptyReject: true}],
      "require-await": "error",
      "vars-on-top": "error",
      "yoda": "error",

      // === Variables ===
      "no-label-var": "error",
      "no-undef-init": "error",

      // === ES2015 ===
      "no-useless-computed-key": "error",
      "no-useless-constructor": "error",
      "no-useless-rename": [
        "error",
        {ignoreDestructuring: true, ignoreImport: true, ignoreExport: true}
      ],
      "no-var": "error",
      "object-shorthand": ["error", "always"],
      "prefer-arrow-callback": ["error", {allowUnboundThis: true}],
      "prefer-destructuring": [
        "error",
        {
          VariableDeclarator: {array: false, object: true},
          AssignmentExpression: {array: false, object: false}
        },
        {enforceForRenamedProperties: false}
      ],
      "prefer-rest-params": "error",
      "prefer-spread": "error",
      "prefer-template": "error",
      "symbol-description": "error",

      // === Import plugin ===
      "import-x/order": [
        "error",
        {
          "newlines-between": "always",
          "groups": [
            ["builtin", "external"],
            ["sibling", "parent", "internal", "index"]
          ],
          "pathGroups": [
            {
              pattern: "*.+(svg|pdf|csv|png|json|webp)",
              patternOptions: {dot: true, nocomment: true, matchBase: true},
              group: "builtin",
              position: "before"
            }
          ]
        }
      ],
      "import-x/no-duplicates": "error",

      // === TypeScript overrides (from @hipo/eslint-config-typescript) ===
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/explicit-member-accessibility": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "no-undef": "off",
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": [
        "error",
        {functions: false, classes: false}
      ],

      // === Project-specific overrides ===
      "no-debugger": "warn",
      "arrow-body-style": "off",
      "no-magic-numbers": "off",
      "prefer-const": "off",
      "max-lines": "off",
      "no-continue": "off",
      "eqeqeq": "off"
    }
  }
);
