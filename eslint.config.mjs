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
      'jsdoc/check-alignment': 'warn',
      'jsdoc/check-param-names': 'warn',
      'jsdoc/check-tag-names': 'warn',
      'jsdoc/require-param': 'warn',
      'jsdoc/require-returns': 'warn',
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
