import globals from 'globals';

import path from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import pluginJs from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: pluginJs.configs.recommended
});

export default [
  ...compat.extends(
    'plugin:import/recommended',
    'plugin:n/recommended',
    'plugin:promise/recommended'
  ),
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
      ecmaVersion: 'latest'
    }
  },
  {
    // src contains browser executable code, not node
    files: ['src/**/*.js'],
    rules: {
      'import/namespace': 'off',
      'import/no-unresolved': 'off',
      'import/no-nodejs-modules': 'error',
      'n/no-extraneous-import': 'error',
      'n/no-missing-import': 'error',
      'n/no-unsupported-features/es-syntax': 'error',
      'n/no-unsupported-features/node-builtins': 'off',
      'n/no-process-env': 'error',
      'n/no-path-concat': 'error',
      'n/no-hide-core-modules': 'error'
    },
    languageOptions: { globals: globals.browser }
  },
  {
    files: ['tool_server/**/*.js', 'tool_server/**/*.mjs'],
    languageOptions: { globals: globals.node }
  },
  {
    files: [
      '**/__tests__/**/*.[jt]s',
      '**/__tests__/**/*.mjs',
      '**/*.test.[jt]s',
      '**/*.test.mjs',
      '**/*.spec.[jt]s',
      '**/*.spec.mjs'
    ],
    rules: {
      'n/no-extraneous-import': 'off'
    },
    languageOptions: {
      globals: {
        ...globals.node
      }
    }
  },
  {
    rules: {
      semi: [2, 'always'],
      'space-before-function-paren': [
        'error',
        {
          anonymous: 'always',
          named: 'never',
          asyncArrow: 'always'
        }
      ],
      'n/no-process-exit': 'off',
      'no-unused-vars': 'warn',
      'import/no-unused-modules': 'error'
    }
  }
];
