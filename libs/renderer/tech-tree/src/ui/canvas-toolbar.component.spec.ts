import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { CanvasToolbarComponent } from './canvas-toolbar.component';

describe('CanvasToolbarComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(CanvasToolbarComponent);
    fixture.componentRef.setInput('categories', ['air_equipment', 'naval_equipment']);
    await fixture.whenStable();
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('mirrors the search text and the chosen categories into its models', async () => {
    const { fixture, loader } = await setup();
    const searches = vi.fn<(search: string) => void>();
    const selections = vi.fn<(categories: readonly string[]) => void>();
    fixture.componentInstance.search.subscribe(searches);
    fixture.componentInstance.selectedCategories.subscribe(selections);

    const search = await loader.getHarness(MatInputHarness);
    await search.setValue('fighter');
    expect(fixture.componentInstance.search()).toBe('fighter');
    expect(searches).toHaveBeenLastCalledWith('fighter');

    const select = await loader.getHarness(MatSelectHarness);
    await select.open();
    await select.clickOptions({ text: 'naval_equipment' });
    expect(fixture.componentInstance.selectedCategories()).toEqual(['naval_equipment']);
    expect(selections).toHaveBeenLastCalledWith(['naval_equipment']);
    await select.clickOptions({ text: 'air_equipment' });
    expect(fixture.componentInstance.selectedCategories()).toEqual([
      'air_equipment',
      'naval_equipment',
    ]);
  });

  it('mirrors its models into the controls', async () => {
    const { fixture, loader } = await setup();
    fixture.componentRef.setInput('search', 'bomber');
    fixture.componentRef.setInput('selectedCategories', ['air_equipment']);
    await fixture.whenStable();
    expect(await (await loader.getHarness(MatInputHarness)).getValue()).toBe('bomber');
    expect(await (await loader.getHarness(MatSelectHarness)).getValueText()).toBe('air_equipment');
  });
});
