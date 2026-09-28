import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatSlideToggleHarness } from '@angular/material/slide-toggle/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { FileDisplayFormComponent } from './file-display-form.component';

describe('FileDisplayFormComponent', () => {
  it('mirrors the hide-unsupported toggle into its model', async () => {
    const fixture = TestBed.createComponent(FileDisplayFormComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    const toggle =
      await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSlideToggleHarness);
    expect(await toggle.getLabelText()).toBe(EN_MESSAGES.appSettings.hideUnsupportedFiles);
    expect(await toggle.isChecked()).toBe(false);
    await toggle.check();
    expect(fixture.componentInstance.hideUnsupportedFiles()).toBe(true);
  });
});
