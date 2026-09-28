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

  it('mirrors the hide-unsupported toggle into its model', async () => {
    const fixture = TestBed.createComponent(FileDisplayFormComponent);
    await fixture.whenStable();
    const toggle =
      await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSlideToggleHarness);
    expect(await toggle.getLabelText()).toBe(EN_MESSAGES.appSettings.hideUnsupportedFiles);
    expect(await toggle.isChecked()).toBe(false);
    await toggle.check();
    expect(fixture.componentInstance.hideUnsupportedFiles()).toBe(true);
  });
});
