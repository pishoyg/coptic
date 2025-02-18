// See https://eslint.org/docs/latest/use/configure/.
'use strict';
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  // Shared rules.
  eslint.configs.recommended,
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    plugins: {
      '@stylistic': stylistic,
    },
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
        CATEGORY: true,
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
