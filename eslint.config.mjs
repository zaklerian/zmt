import nx from '@nx/eslint-plugin';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import perfectionist from 'eslint-plugin-perfectionist';
import playwright from 'eslint-plugin-playwright';
import { builtinModules } from 'node:module';
import tseslint from 'typescript-eslint';

const RENDERER = ['apps/renderer/**', 'libs/renderer/**'];
const RENDERER_TS = RENDERER.map((glob) => `${glob}/*.ts`);
const RENDERER_HTML = RENDERER.map((glob) => `${glob}/*.html`);
const SPECS = ['**/*.spec.ts', 'apps/*-e2e/**/*.ts'];

const KEBAB = '+([a-z])*([a-z0-9])*(-+([a-z0-9]))';
const SUFFIX = '@(component|service|store|schema|model|const|util|guard|routes)';
const SOURCE_TS = `@(index|main|preload|test-setup|${KEBAB}.spec|${KEBAB}.${SUFFIX}?(.spec))`;
const SOURCE_TEMPLATE = `@(index|styles|${KEBAB}.component)`;
const TOOL_TS = `@(index|${KEBAB}?(.spec))`;
const ARTIFACT_FOLDERS =
  '{components,services,stores,utils,helpers,models,interfaces,types,directives,pipes,guards,constants}';

const SYNTAX = {
  barrelNamespace: {
    message: "index.ts contains only export * from './file' lines (ARCH-9).",
    selector: 'ExportAllDeclaration[exported!=null]',
  },
  barrelStatement: {
    message: "index.ts contains only export * from './file' lines (ARCH-9).",
    selector: 'Program > :not(ExportAllDeclaration)',
  },
  booleanStatusKeys: {
    message: 'Model async status as a discriminated union, not boolean flags (STATE-3).',
    selector:
      ':matches(Property, PropertyDefinition, TSPropertySignature)[key.name=/^(loading|isLoading|hasError)$/]',
  },
  eagerChangeDetection: {
    message: 'Rely on the default OnPush strategy (NG-3).',
    selector:
      "MemberExpression[object.name='ChangeDetectionStrategy'][property.name=/^(Default|Eager)$/]",
  },
  enums: {
    message: 'Model closed sets as a const object with a keyof typeof union (ARCH-6).',
    selector: 'TSEnumDeclaration',
  },
  getByText: {
    message: 'Locate elements by role, label or harness, not by text (TEST-2).',
    selector:
      "CallExpression:matches([callee.name='getByText'], [callee.property.name='getByText'])",
  },
  hostDecorators: {
    message: 'Put host bindings and listeners in the decorator host object (NG-7).',
    selector: 'Decorator[expression.callee.name=/^(HostBinding|HostListener)$/]',
  },
  ioDecorators: {
    message: 'Use input(), output() and model() instead of @Input/@Output (NG-4).',
    selector: 'Decorator[expression.callee.name=/^(Input|Output)$/]',
  },
  ipcMainHandle: {
    message: 'Register channels through the typed ipcHandle helper, not ipcMain.handle (SEC-1).',
    selector:
      "MemberExpression[object.name='ipcMain'][property.name=/^(handle|on|once|handleOnce)$/]",
  },
  ipcRendererInvoke: {
    message: 'Preload calls ipcRenderer only through the typed invoke helper (SEC-1).',
    selector: "MemberExpression[object.name='ipcRenderer']",
  },
  mutableArray: {
    message: 'Array types are readonly T[] (ARCH-7).',
    selector: ":not(TSTypeOperator[operator='readonly']) > TSArrayType",
  },
  mutableArrayGeneric: {
    message: 'Use ReadonlyArray<T> or readonly T[] instead of Array<T> (ARCH-7).',
    selector: "TSTypeReference[typeName.name='Array']",
  },
  mutableProperty: {
    message: 'Declared properties are readonly (ARCH-7).',
    selector: 'TSPropertySignature[readonly!=true]',
  },
  safePathCast: {
    message: 'Only the path guard mints SafePath (SEC-3).',
    selector: "TSAsExpression > TSTypeReference[typeName.name='SafePath']",
  },
  storeAsync: {
    message: 'Stores load through resource(), rxResource() or rxMethod() with switchMap (STATE-2).',
    selector: ':function[async=true]',
  },
  storeAwait: {
    message: 'Stores load through resource(), rxResource() or rxMethod() with switchMap (STATE-2).',
    selector: 'AwaitExpression',
  },
};

const BASE_SYNTAX = [
  SYNTAX.enums,
  SYNTAX.mutableArray,
  SYNTAX.mutableArrayGeneric,
  SYNTAX.mutableProperty,
];
const PROCESS_SYNTAX = [
  ...BASE_SYNTAX,
  SYNTAX.ipcMainHandle,
  SYNTAX.ipcRendererInvoke,
  SYNTAX.safePathCast,
];
const RENDERER_SYNTAX = [
  ...BASE_SYNTAX,
  SYNTAX.eagerChangeDetection,
  SYNTAX.ioDecorators,
  SYNTAX.hostDecorators,
  SYNTAX.booleanStatusKeys,
];

const NODE_BUILTINS = builtinModules.filter((name) => !name.startsWith('_'));
const RENDERER_IMPORTS = {
  paths: [
    { message: 'zone.js is not used; the app is zoneless (NG-2).', name: 'zone.js' },
    {
      importNames: ['NgClass', 'NgStyle', 'CommonModule'],
      message: 'Use [class.x] and [style.x] bindings (NG-8).',
      name: '@angular/common',
    },
    {
      importNames: ['ReactiveFormsModule', 'FormsModule'],
      message: 'Forms use Signal Forms from @angular/forms/signals (NG-10).',
      name: '@angular/forms',
    },
    {
      importNames: ['MatDialog'],
      message: 'Open form dialogs through the shared form-dialog helper (NG-11).',
      name: '@angular/material/dialog',
    },
    { message: 'The renderer is sandboxed and never imports electron (ARCH-3).', name: 'electron' },
    ...NODE_BUILTINS.map((name) => ({
      message: 'The renderer is sandboxed and never imports Node built-ins (ARCH-3).',
      name,
    })),
  ],
  patterns: [
    { group: ['zone.js/*'], message: 'zone.js is not used; the app is zoneless (NG-2).' },
    { group: ['node:*'], message: 'The renderer never imports Node built-ins (ARCH-3).' },
    { group: ['electron/*'], message: 'The renderer never imports electron (ARCH-3).' },
  ],
};
const SIGNAL_STORE_IMPORT = {
  group: ['@ngrx/signals', '@ngrx/signals/*'],
  message: 'SignalStores live in *.store.ts inside type:data-access projects (STATE-4).',
};

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/coverage',
      '**/reports',
      '**/out-tsc',
      '**/.angular',
      '**/.nx',
      '**/.stryker-tmp',
      '**/test-results',
      '**/playwright-report',
      '**/vitest.config.*.timestamp*',
      'tools/eslint-rules/fixtures/**',
      'apps/*/src/index.html',
    ],
  },
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
  },
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    files: ['**/*.ts', '**/*.mts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        { format: ['camelCase'], leadingUnderscore: 'allow', selector: 'default' },
        { format: ['camelCase', 'PascalCase'], selector: 'import' },
        { format: ['PascalCase'], selector: 'typeLike' },
        { format: null, selector: ['objectLiteralProperty', 'objectLiteralMethod'] },
        {
          filter: { match: true, regex: 'Store$' },
          format: ['PascalCase'],
          modifiers: ['global', 'const'],
          selector: 'variable',
        },
        {
          format: ['camelCase'],
          modifiers: ['global', 'const'],
          selector: 'variable',
          types: ['function'],
        },
        { format: ['UPPER_CASE'], modifiers: ['global', 'const'], selector: 'variable' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': [
        'error',
        { considerDefaultExhaustiveForUnions: false, requireDefaultForNonUnion: true },
      ],
      'no-restricted-syntax': ['error', ...BASE_SYNTAX],
    },
  },
  {
    extends: [tseslint.configs.disableTypeChecked],
    files: ['**/*.{js,mjs,cjs}'],
  },
  {
    files: ['**/*.{ts,mts,js,mjs}'],
    plugins: { perfectionist },
    rules: {
      'perfectionist/sort-imports': ['error', { type: 'natural' }],
      'perfectionist/sort-named-imports': ['error', { type: 'natural' }],
      'perfectionist/sort-objects': ['error', { type: 'natural' }],
    },
  },
  {
    files: ['**/*.{ts,mts,js,mjs,html}'],
    plugins: { 'check-file': checkFile },
    rules: {
      'check-file/filename-blocklist': [
        'error',
        { [`**/${ARTIFACT_FOLDERS}/**`]: '<domain-noun>/*' },
        { errorMessage: 'Group files by domain; artifact-kind folders are not used (ARCH-12).' },
      ],
      'check-file/filename-naming-convention': [
        'error',
        {
          'tools/**/*.{ts,mjs}': TOOL_TS,
          '{apps,libs}/**/src/**/*.html': SOURCE_TEMPLATE,
          '{apps,libs}/**/{src,fixtures}/**/*.ts': SOURCE_TS,
        },
        {
          errorMessage:
            'File "{{ target }}" must be kebab-case with an artifact suffix (ARCH-10, ARCH-11).',
        },
      ],
      'check-file/folder-naming-convention': ['error', { '{apps,libs,tools}/**/': 'KEBAB_CASE' }],
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          allow: ['^(\\.\\./)+package\\.json$'],
          depConstraints: [
            {
              onlyDependOnLibsWithTags: [
                'type:feature',
                'type:ui',
                'type:data-access',
                'type:util',
                'type:contracts',
              ],
              sourceTag: 'type:app',
            },
            {
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:data-access',
                'type:util',
                'type:contracts',
              ],
              sourceTag: 'type:feature',
            },
            {
              onlyDependOnLibsWithTags: ['type:ui', 'type:util', 'type:contracts'],
              sourceTag: 'type:ui',
            },
            {
              onlyDependOnLibsWithTags: ['type:data-access', 'type:util', 'type:contracts'],
              sourceTag: 'type:data-access',
            },
            { onlyDependOnLibsWithTags: ['type:util', 'type:contracts'], sourceTag: 'type:util' },
            { onlyDependOnLibsWithTags: ['type:contracts'], sourceTag: 'type:contracts' },
            { onlyDependOnLibsWithTags: ['scope:main', 'scope:shared'], sourceTag: 'scope:main' },
            {
              onlyDependOnLibsWithTags: ['scope:preload', 'scope:shared'],
              sourceTag: 'scope:preload',
            },
            {
              onlyDependOnLibsWithTags: ['scope:renderer', 'scope:shared'],
              sourceTag: 'scope:renderer',
            },
            { onlyDependOnLibsWithTags: ['scope:shared'], sourceTag: 'scope:shared' },
          ],
          enforceBuildableLibDependency: false,
        },
      ],
    },
  },
  {
    extends: [...angular.configs.tsRecommended],
    files: RENDERER_TS,
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': [
        'error',
        { prefix: 'zmt', style: 'kebab-case', type: 'element' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { prefix: 'zmt', style: 'camelCase', type: 'attribute' },
      ],
      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@angular-eslint/prefer-standalone': 'error',
      '@nx/workspace-effect-no-signal-write': 'error',
      'no-restricted-imports': [
        'error',
        {
          paths: RENDERER_IMPORTS.paths,
          patterns: [...RENDERER_IMPORTS.patterns, SIGNAL_STORE_IMPORT],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          message:
            'Only *.service.ts in a type:data-access project calls the preload API (STATE-5).',
          object: 'window',
          property: 'api',
        },
      ],
      'no-restricted-syntax': ['error', ...RENDERER_SYNTAX],
    },
  },
  {
    files: ['libs/renderer/*/data-access/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', RENDERER_IMPORTS],
    },
  },
  {
    files: ['libs/renderer/*/data-access/**/*.store.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...RENDERER_SYNTAX, SYNTAX.storeAsync, SYNTAX.storeAwait],
    },
  },
  {
    files: ['**/*.service.ts'],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  {
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    files: RENDERER_HTML,
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'error',
      '@nx/workspace-no-raw-template-text': 'error',
    },
  },
  {
    files: ['**/index.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...BASE_SYNTAX,
        SYNTAX.barrelStatement,
        SYNTAX.barrelNamespace,
      ],
    },
  },
  {
    files: SPECS,
    rules: {
      'no-restricted-syntax': ['error', ...RENDERER_SYNTAX, SYNTAX.getByText],
    },
  },
  {
    extends: [playwright.configs['flat/recommended']],
    files: ['apps/*-e2e/**/*.ts'],
  },
  {
    files: ['apps/main/**/*.ts', 'apps/preload/**/*.ts', 'libs/contracts/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...PROCESS_SYNTAX],
    },
  },
  {
    files: ['apps/main/src/ipc/ipc-handle.util.ts'],
    name: 'ZMT-A-3: the typed handler helper is the one ipcMain.handle call site (SEC-1)',
    rules: {
      'no-restricted-syntax': [
        'error',
        ...BASE_SYNTAX,
        SYNTAX.ipcRendererInvoke,
        SYNTAX.safePathCast,
      ],
    },
  },
  {
    files: ['apps/preload/src/ipc-invoke.util.ts'],
    name: 'ZMT-A-3: the typed invoke helper is the one ipcRenderer call site (SEC-1)',
    rules: {
      'no-restricted-syntax': ['error', ...BASE_SYNTAX, SYNTAX.ipcMainHandle, SYNTAX.safePathCast],
    },
  },
  {
    files: ['apps/main/src/fs/path-guard.util.ts'],
    name: 'ZMT-A-3: the path guard is the one place that mints SafePath (SEC-3)',
    rules: {
      'no-restricted-syntax': [
        'error',
        ...BASE_SYNTAX,
        SYNTAX.ipcMainHandle,
        SYNTAX.ipcRendererInvoke,
      ],
    },
  },
  {
    files: ['apps/main/src/**/*.spec.ts', 'apps/preload/src/**/*.spec.ts'],
    name: 'ZMT-A-3: specs reference mocked Electron module methods through vi.mocked without binding',
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'no-restricted-syntax': ['error', ...BASE_SYNTAX, SYNTAX.safePathCast, SYNTAX.getByText],
    },
  },
  {
    files: ['tools/eslint-rules/src/workspace-plugin.ts'],
    name: 'ZMT-A-2: the Nx workspace-rule loader requires an export named rules',
    rules: {
      '@typescript-eslint/naming-convention': 'off',
    },
  },
  prettier,
);
