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
