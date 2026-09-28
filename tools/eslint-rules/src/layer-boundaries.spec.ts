import { ESLint, Linter } from 'eslint';
import path from 'node:path';
import tseslint from 'typescript-eslint';

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../../..');
const ESLINT = new ESLint({ cwd: WORKSPACE_ROOT });
const LINTER = new Linter({ cwd: WORKSPACE_ROOT });
const TIMEOUT = 120_000;

const UI_FILE = 'libs/renderer/mod-content/src/ui/probe.component.ts';
const DATA_ACCESS_FILE = 'libs/renderer/mod-content/src/data-access/probe.store.ts';
const UTIL_FILE = 'libs/renderer/mod-content/src/util/probe.model.ts';
const FEATURE_FILE = 'libs/renderer/mod-content/src/feature/probe.component.ts';

async function restrictedImports(file: string, code: string): Promise<readonly string[]> {
  const config = (await ESLINT.calculateConfigForFile(
    path.join(WORKSPACE_ROOT, file),
  )) as Linter.Config;
  const rule = config.rules?.['no-restricted-imports'];
  expect(rule).toBeDefined();
  return LINTER.verify(
    code,
    {
      files: ['**/*.ts'],
      languageOptions: { ecmaVersion: 'latest', parser: tseslint.parser, sourceType: 'module' },
      rules: { 'no-restricted-imports': rule ?? 'off' },
    },
    { filename: file },
  ).map((message) => message.message);
}

describe('renderer layer boundaries (ARCH-2)', () => {
  it(
    'rejects a ui file that imports its own data-access layer',
    async () => {
      const messages = await restrictedImports(
        UI_FILE,
        "import { ModContentStore } from '../data-access';\nexport const PROBE = ModContentStore;\n",
      );
      expect(messages).toEqual([expect.stringContaining('ARCH-2')]);
    },
    TIMEOUT,
  );

  it(
    'rejects a ui file that injects a store from another domain',
    async () => {
      const messages = await restrictedImports(
        UI_FILE,
        "import { inject } from '@angular/core';\nimport { WorkspaceStore } from '@zmt/renderer/shell/data-access';\nexport const PROBE = () => inject(WorkspaceStore);\n",
      );
      expect(messages).toEqual([expect.stringContaining('ARCH-2')]);
    },
    TIMEOUT,
  );

  it(
    'rejects a ui file that imports a feature or defines a SignalStore',
    async () => {
      const messages = await restrictedImports(
        UI_FILE,
        "import { signalStore } from '@ngrx/signals';\nimport { ModContentComponent } from '../feature';\nexport const PROBE = [signalStore, ModContentComponent];\n",
      );
      expect(messages).toEqual([
        expect.stringContaining('STATE-4'),
        expect.stringContaining('ARCH-2'),
      ]);
    },
    TIMEOUT,
  );

  it(
    'accepts a ui file that imports util, core and another domain ui',
    async () => {
      const messages = await restrictedImports(
        UI_FILE,
        "import type { FileSelection } from '../util';\nimport { errorOf } from '@zmt/renderer/core';\nimport { NavIconComponent } from '@zmt/renderer/shell/ui';\nexport const PROBE = [errorOf, NavIconComponent] satisfies readonly [unknown, unknown];\nexport type Probe = FileSelection;\n",
      );
      expect(messages).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    'accepts a ui file that injects the MESSAGES token from the shell ui layer',
    async () => {
      const messages = await restrictedImports(
        UI_FILE,
        "import { inject } from '@angular/core';\nimport { MESSAGES } from '@zmt/renderer/shell/ui';\nexport const PROBE = () => inject(MESSAGES);\n",
      );
      expect(messages).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    'rejects a data-access file that imports ui or feature code',
    async () => {
      const messages = await restrictedImports(
        DATA_ACCESS_FILE,
        "import { FileTreeComponent } from '../ui';\nimport { AppSettingsComponent } from '@zmt/renderer/app-settings/feature';\nexport const PROBE = [FileTreeComponent, AppSettingsComponent];\n",
      );
      expect(messages).toEqual([
        expect.stringContaining('ARCH-2'),
        expect.stringContaining('ARCH-2'),
      ]);
    },
    TIMEOUT,
  );

  it(
    'rejects a util file that imports data-access code',
    async () => {
      const messages = await restrictedImports(
        UTIL_FILE,
        "import { ModContentStore } from '../data-access';\nexport const PROBE = ModContentStore;\n",
      );
      expect(messages).toEqual([expect.stringContaining('ARCH-2')]);
    },
    TIMEOUT,
  );

  it(
    'rejects a feature file that imports another domain feature but accepts its own layers',
    async () => {
      const messages = await restrictedImports(
        FEATURE_FILE,
        "import { ModInfoComponent } from '@zmt/renderer/mod-info/feature';\nimport { ModContentStore } from '../data-access';\nimport { FileTreeComponent } from '../ui';\nexport const PROBE = [ModInfoComponent, ModContentStore, FileTreeComponent];\n",
      );
      expect(messages).toEqual([expect.stringContaining('ARCH-2')]);
    },
    TIMEOUT,
  );
});
