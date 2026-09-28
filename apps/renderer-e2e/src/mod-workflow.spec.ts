import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { closeApp, launchApp, type LaunchedApp } from './electron-app.util';
import {
  createFixtureMod,
  FIXTURE_DESCRIPTOR,
  FIXTURE_README,
  type FixtureMod,
  readFixtureFile,
  removeFixtureMod,
  stubCancelledFolderDialog,
  stubFolderDialog,
} from './fixture-mod.util';

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).setLegacyMode(true).analyze();
  expect(results.violations).toEqual([]);
}

function snackbar(page: Page, text: string) {
  return page.locator('[aria-live="polite"]').filter({ hasText: text });
}

function tree(page: Page) {
  return page.getByRole('tree', { name: 'Files' });
}

function treeButton(page: Page, name: string) {
  return tree(page).getByRole('button', { exact: true, name });
}

async function openFixture(launched: LaunchedApp, fixture: FixtureMod): Promise<void> {
  await stubFolderDialog(launched.app, fixture.root);
  await launched.page.getByRole('button', { name: 'Open mod folder' }).first().click();
  await expect(launched.page).toHaveURL('zmt://renderer/mod-content');
  await expect(treeButton(launched.page, 'readme.txt')).toBeVisible();
}

async function selectFile(page: Page, name: string): Promise<void> {
  await treeButton(page, name).click();
}

test.describe('mod workflow', () => {
  let launched: LaunchedApp;
  let fixture: FixtureMod;

  test.beforeEach(async () => {
    fixture = await createFixtureMod();
    launched = await launchApp();
  });

  test.afterEach(async () => {
    await closeApp(launched);
    await removeFixtureMod(fixture);
  });

  test('keeps the empty state when the folder dialog is cancelled', async () => {
    const { app, page } = launched;
    await page.getByRole('link', { exact: true, name: 'Mod content' }).click();
    await expect(page.getByRole('heading', { level: 3 })).toHaveText('No folder opened');
    await stubCancelledFolderDialog(app);
    await page.getByRole('button', { name: 'Open mod folder' }).last().click();
    await expect(page.getByRole('heading', { level: 3 })).toHaveText('No folder opened');
    await expectNoAxeViolations(page);
  });

  test('opens a mod folder and browses its tree lazily', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Mod content');
    await expect(tree(page).getByRole('treeitem')).toHaveCount(5);
    await expect(treeButton(page, 'atlas.dds')).toHaveCount(0);
    await treeButton(page, 'gfx').first().click();
    await expect(treeButton(page, 'thumbnail.png')).toBeVisible();
    await expect(treeButton(page, 'atlas.dds')).toBeDisabled();
    await treeButton(page, 'common').first().click();
    await treeButton(page, 'technologies').first().click();
    await expect(treeButton(page, 'air.txt')).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'File path' }).getByRole('listitem'),
    ).toHaveCount(1);
    await expectNoAxeViolations(page);
  });

  test('edits, saves and discards a text file in the plain editor', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    await selectFile(page, 'readme.txt');
    const editor = page.getByRole('textbox', { name: 'File contents' });
    await expect(editor).toHaveValue(FIXTURE_README);
    await expect(page.getByRole('navigation', { name: 'File path' })).toContainText('readme.txt');
    const save = page.getByRole('button', { exact: true, name: 'Save' });
    await expect(save).toBeDisabled();
    await editor.fill('Edited readme\n');
    await expect(save).toBeEnabled();
    await expectNoAxeViolations(page);
    await save.click();
    await expect(snackbar(page, 'Saved')).toBeVisible();
    expect(await readFixtureFile(fixture.readmePath)).toBe('Edited readme\n');
    await expect(save).toBeDisabled();

    await editor.fill('Discarded\n');
    await page.getByRole('button', { exact: true, name: 'Cancel' }).click();
    await expect(editor).toHaveValue('Edited readme\n');
    expect(await readFixtureFile(fixture.readmePath)).toBe('Edited readme\n');
  });

  test('asks before leaving a dirty editor', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    await selectFile(page, 'readme.txt');
    await page.getByRole('textbox', { name: 'File contents' }).fill('dirty\n');
    await page.getByRole('link', { exact: true, name: 'Home' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading')).toHaveText('Unsaved changes');
    await expectNoAxeViolations(page);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL('zmt://renderer/mod-content');
    await expect(page.getByRole('textbox', { name: 'File contents' })).toHaveValue('dirty\n');

    await selectFile(page, 'descriptor.mod');
    await page.getByRole('dialog').getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByRole('textbox', { name: 'File contents' })).toHaveValue(
      FIXTURE_DESCRIPTOR,
    );
  });

  test('finds files through the search box', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    const search = page.getByRole('combobox', { name: 'Search files' });
    await search.fill('air');
    const option = page.getByRole('option', { name: 'air.txt' });
    await expect(option).toBeVisible();
    await expectNoAxeViolations(page);
    await option.click();
    await expect(page.getByRole('navigation', { name: 'File path' })).toContainText('air.txt');
    await search.fill('nothing-matches');
    await expect(page.getByRole('option')).toHaveCount(0);
  });

  test('shows why an entity file cannot be tabled yet and offers the code view', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    await treeButton(page, 'common').first().click();
    await treeButton(page, 'technologies').first().click();
    await selectFile(page, 'air.txt');
    await expect(page.getByRole('alert').filter({ hasText: 'entity table' })).toContainText(
      'An internal error occurred.',
    );
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    const modes = page.getByRole('radiogroup', { name: 'Panel actions' });
    await expect(modes.getByRole('radio', { name: 'Table view' })).toBeChecked();
    await expectNoAxeViolations(page);
    await modes.getByRole('radio', { name: 'Code view' }).click();
    await expect(page.getByRole('textbox', { name: 'File contents' })).toHaveValue(
      /fixture_fighter/u,
    );
  });

  test('edits the mod descriptor through the form and keeps the file lossless', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    await selectFile(page, 'descriptor.mod');
    await expect(page.getByRole('textbox', { name: 'File contents' })).toHaveValue(
      FIXTURE_DESCRIPTOR,
    );
    await page
      .getByRole('radiogroup', { name: 'Panel actions' })
      .getByRole('radio', { name: 'Form view' })
      .click();
    await expect(page).toHaveURL('zmt://renderer/mod-info');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Mod descriptor');
    const name = page.getByRole('textbox', { name: 'Name' });
    await expect(name).toHaveValue('Fixture Mod');
    await expect(name).toHaveAttribute('readonly');
    const version = page.getByRole('textbox', { exact: true, name: 'Version' });
    await expect(version).toHaveValue('0.1');
    await version.fill('0.2');
    await page.getByRole('textbox', { name: 'Add tag…' }).fill('Balance');
    await page.getByRole('textbox', { name: 'Add tag…' }).press('Enter');
    await expectNoAxeViolations(page);
    await page.getByRole('button', { exact: true, name: 'Save' }).click();
    await expect(snackbar(page, 'Descriptor saved')).toBeVisible();
    expect(await readFixtureFile(fixture.descriptorPath)).toBe(
      FIXTURE_DESCRIPTOR.replace('version="0.1"', 'version="0.2"').replace(
        '\t"Gameplay"\n',
        '\t"Gameplay"\n\t"Balance"\n',
      ),
    );
  });

  test('lists enabled features and routes aircraft to the tech tree', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    await page.getByRole('link', { exact: true, name: 'Features' }).click();
    const list = page.getByRole('navigation', { name: 'Enabled features' });
    await expect(list.getByRole('button')).toHaveText(['Aircraft']);
    await expectNoAxeViolations(page);
    await list.getByRole('button', { name: 'Aircraft' }).click();
    await expect(page).toHaveURL('zmt://renderer/tech-tree');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Tech tree');
    await expectNoAxeViolations(page);
  });

  test('hides unsupported files after saving the setting', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    await page.getByRole('link', { exact: true, name: 'Settings' }).click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('App settings');
    const save = page.getByRole('button', { exact: true, name: 'Save' });
    await expect(save).toBeDisabled();
    await page.getByRole('switch', { name: 'Hide unsupported files' }).click();
    await expect(save).toBeEnabled();
    await expectNoAxeViolations(page);
    await save.click();
    await expect(snackbar(page, 'Settings saved')).toBeVisible();
    await expect(save).toBeDisabled();

    await page.getByRole('link', { exact: true, name: 'Mod content' }).click();
    await treeButton(page, 'gfx').first().click();
    await expect(treeButton(page, 'thumbnail.png')).toBeVisible();
    await expect(treeButton(page, 'atlas.dds')).toHaveCount(0);
  });

  test('switches the locale on a populated screen without reload', async () => {
    const { page } = launched;
    await openFixture(launched, fixture);
    await selectFile(page, 'readme.txt');
    let navigations = 0;
    page.on('framenavigated', () => {
      navigations += 1;
    });
    await page
      .getByRole('radiogroup', { name: 'Language' })
      .getByRole('radio', { name: 'Deutsch' })
      .click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Mod-Inhalt');
    await expect(page.getByRole('tree', { name: 'Dateien' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Dateien suchen' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Dateiinhalt' })).toHaveValue(FIXTURE_README);
    await expect(page.getByRole('button', { exact: true, name: 'Speichern' })).toBeDisabled();
    await expectNoAxeViolations(page);
    await page
      .getByRole('radiogroup', { name: 'Sprache' })
      .getByRole('radio', { name: 'English' })
      .click();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Mod content');
    expect(navigations).toBe(0);
  });
});
