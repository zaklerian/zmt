import { type ElectronApplication } from '@playwright/test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface FixtureMod {
  readonly descriptorPath: string;
  readonly readmePath: string;
  readonly root: string;
  readonly technologyPath: string;
}

export const FIXTURE_DESCRIPTOR = [
  'version="0.1"',
  'tags={',
  '\t"Gameplay"',
  '}',
  'name="Fixture Mod"',
  'supported_version="1.14.*"',
  'picture="thumbnail.png"',
  'remote_file_id="42"',
  '',
].join('\n');

export const FIXTURE_README = 'Fixture readme\n';

export const FIXTURE_TECHNOLOGY =
  'technologies = {\n\tfixture_fighter = {\n\t\tresearch_cost = 2\n\t}\n}\n';

export async function createFixtureMod(): Promise<FixtureMod> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zmt-fixture-'));
  await mkdir(path.join(root, 'common', 'technologies'), { recursive: true });
  await mkdir(path.join(root, 'gfx'), { recursive: true });
  const descriptorPath = path.join(root, 'descriptor.mod');
  const readmePath = path.join(root, 'readme.txt');
  const technologyPath = path.join(root, 'common', 'technologies', 'air.txt');
  await writeFile(descriptorPath, FIXTURE_DESCRIPTOR, 'utf8');
  await writeFile(readmePath, FIXTURE_README, 'utf8');
  await writeFile(technologyPath, FIXTURE_TECHNOLOGY, 'utf8');
  await writeFile(path.join(root, 'gfx', 'thumbnail.png'), new Uint8Array([137, 80, 78, 71]));
  await writeFile(path.join(root, 'gfx', 'atlas.dds'), new Uint8Array([68, 68, 83, 32]));
  return { descriptorPath, readmePath, root, technologyPath };
}

export async function removeFixtureMod(fixture: FixtureMod): Promise<void> {
  await rm(fixture.root, { force: true, recursive: true });
}

export function readFixtureFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf8');
}

export async function stubFolderDialog(app: ElectronApplication, folder: string): Promise<void> {
  await app.evaluate(({ dialog }, chosen) => {
    Reflect.set(dialog, 'showOpenDialog', () =>
      Promise.resolve({ canceled: false, filePaths: [chosen] }),
    );
  }, folder);
}

export async function stubCancelledFolderDialog(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ dialog }) => {
    Reflect.set(dialog, 'showOpenDialog', () => Promise.resolve({ canceled: true, filePaths: [] }));
  });
}
