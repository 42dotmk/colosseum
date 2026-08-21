import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.cache/**",
      "**/.strapi/**",
      "**/.tmp/**",
      "**/coverage/**",

      "senatus/types/generated/**",

      // Strapi-generated/example files that aren't application code.
      "senatus/src/admin/*.example.*",
    ],
  },

  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],

    rules: {
      // Avoid coercion bugs.
      eqeqeq: ["error", "always"],

      // Require braces around control-flow statements.
      curly: ["error", "all"],

      // Avoid duplicate imports from the same module.
      "no-duplicate-imports": [
        "error",
        {
          allowSeparateTypeImports: true,
        },
      ],

      // Modern JavaScript basics.
      "no-var": "error",
      "prefer-const": "error",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["**/*.{ts,tsx}"],

    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Keep visible, but don't block existing code.
      "@typescript-eslint/no-explicit-any": "warn",

      // Allow both `type` and `interface`.
      "@typescript-eslint/consistent-type-definitions": "off",

      // Variable shadowing is allowed for now.
      "@typescript-eslint/no-shadow": "off",
      "no-shadow": "off",

      // Existing CommonJS require() imports are allowed.
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Browser / React application.
  {
    files: ["web/**/*.{ts,tsx}"],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },

    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    rules: {
      ...reactHooks.configs.recommended.rules,

      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],

      // Allow warn/error, but flag leftover console.log calls.
      "no-console": [
        "warn",
        {
          allow: ["warn", "error"],
        },
      ],
    },
  },

  // Node / backend / infrastructure code.
  {
    files: [
      "senatus/**/*.{ts,tsx}",
      "executioner/**/*.ts",
      "lib/queue/**/*.ts",
    ],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },

    rules: {
      // Backend/service logging is expected.
      "no-console": "off",
    },
  },

  // Frontend configuration files execute in Node.
  {
    files: ["web/*.config.{js,mjs,cjs,ts}", "web/codegen.ts"],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },

    rules: {
      "no-console": "off",
    },
  },
];
