// See https://eslint.org/docs/latest/use/configure/.
'use strict';
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginJsdoc from 'eslint-plugin-jsdoc';

export default tseslint.config(
  // Shared rules.
  eslint.configs.recommended,
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      '@stylistic': stylistic,
      prettier: eslintPluginPrettier,
      jsdoc: eslintPluginJsdoc,
    },
    extends: [eslintConfigPrettier],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      semi: 'error',
      'prefer-const': 'error',
      indent: ['error', 2, { SwitchCase: 1 }],
      'max-len': [
        'error',
        {
          code: 80,
          ignoreTemplateLiterals: true,
          ignoreStrings: true,
          ignoreRegExpLiterals: true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@stylistic/quotes': [
        'error',
        'single',
        {
          avoidEscape: true,
        },
      ],
      'prettier/prettier': 'error',
      'jsdoc/check-alignment': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/require-param': 'error',
      'jsdoc/require-returns': 'error',
      'no-restricted-syntax': [
        // Enforce uniform use of `querySelector` or `querySelectorAll` to make
        // the code easier to search.
        'error',
        {
          selector:
            "CallExpression[callee.property.name='getElementsByTagName']",
          message:
            'Avoid getElementsByTagName; use querySelector or querySelectorAll instead.',
        },
        {
          selector: "CallExpression[callee.property.name='getElementsByName']",
          message:
            'Avoid getElementsByName; use querySelector or querySelectorAll instead.',
        },
        {
          selector:
            "CallExpression[callee.property.name='getElementsByClassName']",
          message:
            'Avoid getElementsByClassName; use querySelectorAll instead.',
        },
        {
          selector: 'MemberExpression[property.name=/^on\\w+/]',
          message:
            'Avoid using DOM event handler properties like `onclick`. Use `addEventListener` instead.',
        },
        {
          selector:
            "CallExpression[callee.property.name='querySelector'] Literal[value=/^#/]",
          message:
            'Use getElementById instead of querySelector with an ID selector.',
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        project: true,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        XOOXLE: true,
        ANKI: true,
        NOTE: true,
        INDEX: true,
        INDEX_INDEX: true,
      },
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    ...eslintPluginJsdoc.configs['flat/recommended-typescript'],
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
          },
        },
      ],
    },
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    rules: {
      'max-len': ['warn'],
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  }
);
