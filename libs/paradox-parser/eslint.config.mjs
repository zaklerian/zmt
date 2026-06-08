import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    languageOptions: {
      parser: await import('jsonc-eslint-parser')
    },
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          // @lezer/lr is used only by the generated parser under
          // src/cst/__generated__, which eslint ignores globally — so the
          // dependency-check can't see the usage. Declare it explicitly.
          ignoredDependencies: ['@lezer/lr'],
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/src/**/*.spec.{ts,tsx,mts,cts}',
            '{projectRoot}/src/**/*.test.{ts,tsx,mts,cts}'
          ]
        }
      ]
    }
  }
];
