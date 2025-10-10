// See https://eslint.org/docs/latest/use/configure/.
'use strict';
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import eslintPluginPrettier from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginJsdoc from 'eslint-plugin-jsdoc';

/* eslint-disable no-magic-numbers */
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
          selector: 'MemberExpression[property.name=className]',
          message: 'Avoid using `className`. Use `classList` instead.',
        },
        {
          selector:
            "CallExpression[callee.property.name='querySelector'] Literal[value=/^#/]",
          message:
            'Use getElementById instead of querySelector with an ID selector.',
        },
        {
          selector:
            "CallExpression[callee.object.name='play'][callee.property.name='test']",
          message: 'Use `base.test` instead of `play.test`. See `test/base.ts`',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        // Ignore all variables called '_'.
        {
          selector: ['variable', 'parameter'],
          format: null, // No restrictions whatsoever.
          filter: {
            regex: '^_$',
            match: true,
          },
        },
        // camelCase for variables and functions
        {
          selector: 'default',
          format: ['camelCase'],
        },
        // PascalCase for classes and types
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        // UPPER_CASE for constants
        {
          selector: 'variable',
          modifiers: ['const'],
          format: ['UPPER_CASE'],
          filter: {
            regex: '^[A-Z0-9][A-Z0-9_]*$',
            match: true,
          },
        },
        // camelCase for function parameters
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
        // PascalCase for enums
        {
          selector: 'enum',
          format: ['PascalCase'],
        },
        // camelCase for enum members
        {
          selector: 'enumMember',
          format: ['UPPER_CASE'],
        },
        // No convention for object properties.
        {
          selector: 'objectLiteralProperty',
          format: null,
        },
        // UPPER_CASE for static readonly class properties (they're like
        // constants).
        {
          selector: 'classProperty',
          modifiers: ['static', 'readonly'],
          format: ['UPPER_CASE'],
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-console': ['error'],
      '@typescript-eslint/no-floating-promises': 'error',
      complexity: ['error', 12],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      'no-magic-numbers': [
        'error',
        { ignore: [0, 1, -1, 2], ignoreArrayIndexes: true, enforceConst: true },
      ],
      'max-depth': ['error', 3],
      'no-shadow': 'off',
      'default-case': 'error',
      'default-case-last': 'error',
      eqeqeq: ['error', 'always'],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-duplicate-imports': 'error',
      'no-restricted-globals': ['error', 'event', 'fdescribe'],
      'prefer-template': 'error',
      'prefer-arrow-callback': 'error',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: false,
        },
      ],
      'max-lines': [
        'error',
        { max: 500, skipBlankLines: true, skipComments: true },
      ],
      'max-nested-callbacks': ['error', 3],
    },
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.json', // For the site logic.
          './tsconfig_test.json', // For unit tests.
          './tsconfig_playwright.json', // For Playwright tests and artifacts.
        ],
      },
      globals: {
        ...globals.browser,
        // ANKI is a global variable added to the version of the JavaScript that
        // runs on Anki. This allows our JavaScript to distinguish whether or
        // not it's running on Anki.
        // Since it gets define in the Anki code, and accessed by packages that
        // can't access its definition, it needs to be declared as a global.
        ANKI: true,
      },
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
      },
    },
  },
  {
    // TypeScript-only rules.
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    ...eslintPluginJsdoc.configs['flat/recommended-typescript'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-shadow': ['error'],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
        },
      ],
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
      '@typescript-eslint/explicit-member-accessibility': 'error',
    },
  },
  {
    // JavaScript-only rules.
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // JavaScript-only rules.
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    rules: {
      'max-len': ['warn'],
      '@typescript-eslint/no-unused-expressions': 'warn',
    },
  }
);
