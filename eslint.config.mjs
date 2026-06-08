import eslintConfigPrettier from 'eslint-config-prettier';
import nx from '@nx/eslint-plugin';
import perfectionist from 'eslint-plugin-perfectionist';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/__generated__',
      '**/dist',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*'
    ]
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:renderer',
              onlyDependOnLibsWithTags: ['scope:renderer', 'scope:shared'],
            },
            {
              sourceTag: 'scope:main',
              onlyDependOnLibsWithTags: ['scope:main', 'scope:shared'],
            },
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
          ],
        }
      ]
    }
  },
  perfectionist.configs['recommended-alphabetical'],
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['vitest.workspace.ts', '*.config.mjs', '*.config.ts']
        },
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-floating-promises': 'error',   // R-CODE-6
      '@typescript-eslint/no-unnecessary-type-assertion': 'error', // R-TS-2 (partial)
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      'no-restricted-syntax': [                              // R-TS-3
        'error',
        { selector: 'TSEnumDeclaration', message: 'Use const object + keyof typeof derived union per R-TS-3.' }
      ]
    }
  },
  {
    files: ['**/*.tsx'],
    rules: {
      'perfectionist/sort-jsx-props': 'off'
    }
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs'
    ],
    rules: {}
  },
  eslintConfigPrettier,
];
