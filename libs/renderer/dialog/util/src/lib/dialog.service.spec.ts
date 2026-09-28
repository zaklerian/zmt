import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { NotImplementedError } from '@zmt/renderer/pending/util';
import { firstValueFrom } from 'rxjs';

import { type HasUnsavedChanges } from './dialog.model';
import { DialogService } from './dialog.service';

@Component({ selector: 'zmt-dialog-host', template: '' })
class HostComponent implements HasUnsavedChanges {
  readonly dirty = signal(false);
}

const CONFIRM = {
  cancelLabel: 'keep',
  confirmLabel: 'discard',
  message: 'lose edits?',
  title: 'unsaved',
};

describe('DialogService', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    const loader = TestbedHarnessEnvironment.documentRootLoader(fixture);
    return { loader, service: TestBed.inject(DialogService) };
  }

  it('resolves true when the confirm button is pressed', async () => {
    const { loader, service } = setup();
    const result = firstValueFrom(service.confirm(CONFIRM));
    const dialog = await loader.getHarness(MatDialogHarness);
    expect(await dialog.getTitleText()).toBe('unsaved');
    expect(await dialog.getContentText()).toBe('lose edits?');
    const [cancel, confirm] = await dialog.getAllHarnesses(MatButtonHarness);
    expect(await cancel?.getText()).toBe('keep');
    await confirm?.click();
    await expect(result).resolves.toBe(true);
  });

  it('resolves false when the confirm dialog is cancelled', async () => {
    const { loader, service } = setup();
    const result = firstValueFrom(service.confirm(CONFIRM));
    const dialog = await loader.getHarness(MatDialogHarness);
    const [cancel] = await dialog.getAllHarnesses(MatButtonHarness);
    await cancel?.click();
    await expect(result).resolves.toBe(false);
  });

  it('shows an info dialog with a single button and resolves when it closes', async () => {
    const { loader, service } = setup();
    const result = firstValueFrom(
      service.info({ confirmLabel: 'ok', message: 'saved', title: 'done' }),
    );
    const dialog = await loader.getHarness(MatDialogHarness);
    const buttons = await dialog.getAllHarnesses(MatButtonHarness);
    expect(buttons).toHaveLength(1);
    await buttons[0]?.click();
    await expect(result).resolves.toBeUndefined();
  });

  it('declares the form dialog helper as pending', () => {
    const { service } = setup();
    expect(() => service.openForm(HostComponent, { data: null, discard: CONFIRM })).toThrow(
      NotImplementedError,
    );
  });
});
