import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { FileDisplayFormComponent } from './file-display-form.component';

describe('FileDisplayFormComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  it('mirrors the hide-unsupported toggle into its model and back', async () => {
    const fixture = TestBed.createComponent(FileDisplayFormComponent);
    await fixture.whenStable();
    const changes = vi.fn<(hide: boolean) => void>();
    fixture.componentInstance.hideUnsupportedFiles.subscribe(changes);
    const toggle =
      await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSlideToggleHarness);
    expect(await toggle.getLabelText()).toBe(EN_MESSAGES.appSettings.hideUnsupportedFiles);
    expect(await toggle.isChecked()).toBe(false);
    await toggle.check();
    expect(fixture.componentInstance.hideUnsupportedFiles()).toBe(true);
    expect(changes).toHaveBeenLastCalledWith(true);

    fixture.componentRef.setInput('hideUnsupportedFiles', false);
    await fixture.whenStable();
    expect(await toggle.isChecked()).toBe(false);
  });
});
