import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

const testGlobals = {
  describe: "readonly",
  expect: "readonly",
  test: "readonly",
  vi: "readonly",
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    ...js.configs.recommended,
    files: ["**/*.js"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrors: "none",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  ...pluginVue.configs["flat/essential"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/no-mutating-props": "off",
    },
  },
  {
    files: ["tests/**/*.js", "src/**/*.test.js", "src/**/*.spec.js"],
    languageOptions: {
      globals: testGlobals,
    },
  },
];
