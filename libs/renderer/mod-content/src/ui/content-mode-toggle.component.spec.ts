import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ContentModeToggleComponent } from './content-mode-toggle.component';

describe('ContentModeToggleComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  it('labels the form and code toggles and updates the mode model', async () => {
    const fixture = TestBed.createComponent(ContentModeToggleComponent);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const group = await loader.getHarness(MatButtonToggleGroupHarness);
    const [form, code] = await group.getToggles();
    expect(await form?.getText()).toBe(EN_MESSAGES.modContent.formView);
    expect(await code?.getText()).toBe(EN_MESSAGES.modContent.codeView);
    expect(await form?.isChecked()).toBe(true);

    await code?.check();
    expect(fixture.componentInstance.mode()).toBe('code');
    await form?.check();
    expect(fixture.componentInstance.mode()).toBe('table');
  });
});
