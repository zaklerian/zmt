import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { NoFolderStateComponent } from './no-folder-state.component';

describe('NoFolderStateComponent', () => {
  it('shows the empty state and emits openFolder from its button', async () => {
    const fixture = TestBed.createComponent(NoFolderStateComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    let opened = 0;
    fixture.componentInstance.openFolder.subscribe(() => {
      opened += 1;
    });
    const button = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatButtonHarness);
    expect(await button.getText()).toBe(EN_MESSAGES.shell.openFolder);
    await button.click();
    expect(opened).toBe(1);
  });
});
