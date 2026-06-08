import nx from '@nx/eslint-plugin';

import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/react'],
  {
    files: ['**/*.tsx'],
    rules: {
      'react/jsx-sort-props': [
        'error',
        { callbacksLast: true, ignoreCase: false, reservedFirst: true }
      ]
    }
  },
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: await import('jsonc-eslint-parser')
    },
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/src/**/*.spec.{ts,tsx,mts,cts}',
            '{projectRoot}/src/**/*.test.{ts,tsx,mts,cts}'
          ]
        }
      ]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              message:
                'Renderer must not import electron directly. Use window.api (typed via @contracts).',
              name: 'electron'
            }
          ],
          patterns: [
            {
              group: ['node:*', 'fs', 'fs/*', 'path', 'os', 'child_process', 'crypto'],
              message:
                'Renderer runs in a sandboxed browser context. Node built-ins are unavailable at runtime — use IPC to request data from main.'
            }
          ]
        }
      ]
    }
  }
];
