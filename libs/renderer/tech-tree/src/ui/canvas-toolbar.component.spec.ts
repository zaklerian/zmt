import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { CanvasToolbarComponent } from './canvas-toolbar.component';

describe('CanvasToolbarComponent', () => {
  it('mirrors the search text and the chosen categories into its models', async () => {
    const fixture = TestBed.createComponent(CanvasToolbarComponent);
    fixture.componentRef.setInput('categories', ['air_equipment', 'naval_equipment']);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);

    const search = await loader.getHarness(MatInputHarness);
    await search.setValue('fighter');
    expect(fixture.componentInstance.search()).toBe('fighter');

    const select = await loader.getHarness(MatSelectHarness);
    await select.open();
    await select.clickOptions({ text: 'naval_equipment' });
    expect(fixture.componentInstance.selectedCategories()).toEqual(['naval_equipment']);
  });
});
