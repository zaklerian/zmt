import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/prefer-readonly-parameter-types': [
        'error',
        {
          allow: [
            {
              from: 'package',
              name: ['BrowserWindow', 'IpcMainInvokeEvent'],
              package: 'electron'
            }
          ],
          ignoreInferredTypes: true,
          treatMethodsAsReadonly: true
        }
      ]
    }
  }
];
