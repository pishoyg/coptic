import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.eslintRecommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      semi: 'error',
      'prefer-const': 'error',
      'indent': ['error', 2],
      'max-len': ['warn', {
        'code': 80,
        'ignoreComments': false,
        'ignoreTrailingComments': false,
      }],
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@stylistic/quotes': ['error', 'single'],
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    }
  }
);
