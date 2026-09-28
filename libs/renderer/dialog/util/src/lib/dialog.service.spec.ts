import { TestKey } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { firstValueFrom } from 'rxjs';

import { type HasUnsavedChanges } from './dialog.model';
import { DialogService } from './dialog.service';

@Component({ selector: 'zmt-dialog-host', template: '' })
class HostComponent implements HasUnsavedChanges {
  readonly dirty = signal(false);
}

@Component({
  imports: [MatButtonModule, MatDialogModule],
  selector: 'zmt-form-dialog-host',
  template: `
    <h2 mat-dialog-title>{{ data }}</h2>
    <mat-dialog-actions>
      <button matButton type="button" class="submit" (click)="ref.close('saved')">
        {{ data }}
      </button>
    </mat-dialog-actions>
  `,
})
class FormDialogComponent implements HasUnsavedChanges {
  protected readonly data = inject<string>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<FormDialogComponent, string>>(MatDialogRef);
  readonly dirty = formDirty.asReadonly();
}

const formDirty = signal(false);

const CONFIRM = {
  cancelLabel: 'keep',
  confirmLabel: 'discard',
  message: 'lose edits?',
  title: 'unsaved',
};

describe('DialogService', () => {
  beforeEach(() => {
    formDirty.set(false);
  });

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

  it('opens a form dialog with its data and resolves with the form result', async () => {
    const { loader, service } = setup();
    const result = firstValueFrom(
      service.openForm<string, string>(FormDialogComponent, { data: 'entity', discard: CONFIRM }),
    );
    const dialog = await loader.getHarness(MatDialogHarness);
    expect(await dialog.getTitleText()).toBe('entity');
    const submit = await dialog.getHarness(MatButtonHarness.with({ selector: '.submit' }));
    await submit.click();
    await expect(result).resolves.toBe('saved');
  });

  it('closes a clean form on escape without asking', async () => {
    const { loader, service } = setup();
    const result = firstValueFrom(
      service.openForm<string, string>(FormDialogComponent, { data: 'entity', discard: CONFIRM }),
    );
    const dialog = await loader.getHarness(MatDialogHarness);
    await (await dialog.host()).sendKeys(TestKey.ESCAPE);
    await expect(result).resolves.toBeUndefined();
    expect(await loader.getAllHarnesses(MatDialogHarness)).toHaveLength(0);
  });

  it('keeps a dirty form open when discarding is refused and closes it when accepted', async () => {
    const { loader, service } = setup();
    formDirty.set(true);
    const result = firstValueFrom(
      service.openForm<string, string>(FormDialogComponent, { data: 'entity', discard: CONFIRM }),
    );
    const form = await loader.getHarness(MatDialogHarness);
    await (await form.host()).sendKeys(TestKey.ESCAPE);
    let confirmDialog = (await loader.getAllHarnesses(MatDialogHarness)).at(-1);
    expect(await confirmDialog?.getTitleText()).toBe('unsaved');
    const [keep] = (await confirmDialog?.getAllHarnesses(MatButtonHarness)) ?? [];
    await keep?.click();
    await vi.waitFor(async () => {
      expect(await loader.getAllHarnesses(MatDialogHarness)).toHaveLength(1);
    });

    await (await form.host()).sendKeys(TestKey.ESCAPE);
    confirmDialog = (await loader.getAllHarnesses(MatDialogHarness)).at(-1);
    const [, discard] = (await confirmDialog?.getAllHarnesses(MatButtonHarness)) ?? [];
    await discard?.click();
    await expect(result).resolves.toBeUndefined();
    expect(await loader.getAllHarnesses(MatDialogHarness)).toHaveLength(0);
  });

  it('asks before discarding a dirty form on a backdrop click', async () => {
    const { loader, service } = setup();
    formDirty.set(true);
    const result = firstValueFrom(
      service.openForm<string, string>(FormDialogComponent, { data: 'entity', discard: CONFIRM }),
    );
    await loader.getHarness(MatDialogHarness);
    const backdrop = document.querySelector('.cdk-overlay-backdrop');
    expect(backdrop).not.toBeNull();
    backdrop?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const confirmDialog = (await loader.getAllHarnesses(MatDialogHarness)).at(-1);
    expect(await confirmDialog?.getTitleText()).toBe('unsaved');
    const [, discard] = (await confirmDialog?.getAllHarnesses(MatButtonHarness)) ?? [];
    await discard?.click();
    await expect(result).resolves.toBeUndefined();
  });
});
