import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.cache/**',
    '**/.strapi/**',
    '**/.tmp/**',
    '**/coverage/**',

    '**/src/__generated__/**',

    'senatus/types/generated/**',

    'senatus/src/admin/*.example.*',

    'senatus/src/extensions/documentation/documentation/**',
  ]),

  {
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],

    rules: {
      eqeqeq: ['error', 'always'],

      curly: ['error', 'all'],

      'no-duplicate-imports': [
        'error',
        {
          allowSeparateTypeImports: true,
        },
      ],

      'no-var': 'error',

      'prefer-const': 'error',

      'no-debugger': 'error',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],

    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/no-shadow': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['client/src/**/*.{js,jsx,ts,tsx}', 'web/src/**/*.{js,jsx,ts,tsx}'],

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },

    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },

    rules: {
      ...reactHooks.configs.recommended.rules,

      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],
      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],
    },
  },
  {
    files: [
      'senatus/**/*.{js,mjs,cjs,ts}',
      'executioner/**/*.{js,mjs,cjs,ts}',
      'lib/queue/**/*.{js,mjs,cjs,ts}',
    ],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },

    rules: {
      'no-console': 'off',
    },
  },
  {
    files: [
      'client/*.config.{js,mjs,cjs,ts}',
      'client/codegen.ts',

      'web/*.config.{js,mjs,cjs,ts}',
      'web/codegen.ts',

      '*.config.{js,mjs,cjs,ts}',
      '*.mjs',
    ],

    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },

    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
]);
