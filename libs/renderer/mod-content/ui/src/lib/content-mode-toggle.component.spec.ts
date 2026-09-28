import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ContentModeToggleComponent } from './content-mode-toggle.component';

describe('ContentModeToggleComponent', () => {
  it('labels the structured toggle by the structured view and updates the mode model', async () => {
    const fixture = TestBed.createComponent(ContentModeToggleComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('structuredView', 'form');
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const group = await loader.getHarness(MatButtonToggleGroupHarness);
    const [structured, code] = await group.getToggles();
    expect(await structured?.getText()).toBe(EN_MESSAGES.modContent.formView);
    expect(await structured?.isChecked()).toBe(true);

    await code?.check();
    expect(fixture.componentInstance.mode()).toBe('code');
    await structured?.check();
    expect(fixture.componentInstance.mode()).toBe('table');
  });
});
