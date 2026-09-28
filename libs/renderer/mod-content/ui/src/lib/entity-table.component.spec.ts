import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatTableHarness } from '@angular/material/table/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { EntityTableComponent } from './entity-table.component';

describe('EntityTableComponent', () => {
  it('renders columns, rows and actions and emits selection and action ids', async () => {
    const fixture = TestBed.createComponent(EntityTableComponent);
    fixture.componentRef.setInput('actions', [{ available: true, id: 'edit', label: 'Edit' }]);
    fixture.componentRef.setInput('columns', [{ id: 'name', label: 'Name', sortable: true }]);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('rows', [
      { cells: { name: 'fighter1' }, id: 'fighter1', state: 'normal' },
      { cells: {}, id: 'cas1', state: 'warning' },
    ]);
    await fixture.whenStable();
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const events = vi.fn<(event: null | string) => void>();
    fixture.componentInstance.selectRow.subscribe(events);
    fixture.componentInstance.runAction.subscribe((id) => {
      events(`action:${id}`);
    });

    const table = await loader.getHarness(MatTableHarness);
    expect(await (await table.host()).getAttribute('aria-label')).toBe(
      EN_MESSAGES.modContent.entityTable,
    );
    const rows = await table.getRows();
    expect(rows).toHaveLength(2);
    expect(await rows[0]?.getCellTextByIndex()).toEqual(['fighter1']);
    expect(await rows[1]?.getCellTextByIndex()).toEqual(['']);

    await (await rows[0]?.host())?.click();
    fixture.componentRef.setInput('selectedRowId', 'fighter1');
    await fixture.whenStable();
    await (await rows[0]?.host())?.click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.action' }))).click();
    expect(events.mock.calls).toEqual([['fighter1'], [null], ['action:edit']]);
  });
});
