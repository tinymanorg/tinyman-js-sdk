const path = require("path");

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  env: {
    browser: true,
    jest: true,
    es6: true
  },
  extends: [
    "@hipo/eslint-config-base",
    "@hipo/eslint-config-typescript",
    "prettier",
    "plugin:import/typescript"
  ],
  parserOptions: {
    project: path.resolve(__dirname, "./tsconfig.json"),
    tsconfigRootDir: __dirname,
    ecmaVersion: 2018,
    sourceType: "module",
    createDefaultProgram: true
  },
  settings: {
    react: {
      version: "detect"
    },
    "import/resolver": {
      typescript: {}
    }
  },
  globals: {},
  rules: {
    "@typescript-eslint/ban-ts-comment": "off",
    "valid-jsdoc": "off",
    "no-debugger": "warn",
    "arrow-body-style": "off",
    "no-magic-numbers": "off",
    "line-comment-position": "off",
    "prefer-const": "off",
    "max-lines": "off",
    "no-continue": "off",
    eqeqeq: "off"
  },
  overrides: [
    {
      files: [".eslintrc.js"],
      rules: {
        "@typescript-eslint/no-var-requires": "off"
      }
    },
    {
      files: ["*.d.ts"],
      rules: {
        "newline-after-var": "off"
      }
    }
  ]
};
