import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import type { TechnologyDeletePlanResult } from '../util';

import { TechnologyDeleteDialogComponent } from './technology-delete-dialog.component';

const PLAN: TechnologyDeletePlanResult = {
  item: { blocked: [], inboundReferences: [], targets: ['fighter1'] },
  tree: { blocked: ['cas1'], inboundReferences: ['bomber1'], targets: ['fighter1', 'fighter2'] },
};

describe('TechnologyDeleteDialogComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  async function setup(hasTree: boolean) {
    const fixture = TestBed.createComponent(TechnologyDeleteDialogComponent);
    fixture.componentRef.setInput('hasTree', hasTree);
    fixture.componentRef.setInput('plan', PLAN);
    fixture.componentRef.setInput('token', 'fighter1');
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('renders the server plan for both modes and emits the chosen mode', async () => {
    const { fixture, host, loader } = await setup(true);
    expect(host.querySelector('h3')?.textContent.trim()).toBe(
      EN_MESSAGES.techTree.deleteTitle('fighter1'),
    );
    expect(host.querySelector('.item-summary')?.textContent.trim()).toBe(
      EN_MESSAGES.techTree.deleteItemSummary(1),
    );
    expect(host.querySelector('.tree-summary')?.textContent.trim()).toBe(
      [
        EN_MESSAGES.techTree.deleteTreeSummary(2),
        EN_MESSAGES.techTree.deleteBlocked(1),
        EN_MESSAGES.techTree.deleteInbound(1),
      ].join(' '),
    );
    const events = vi.fn<(event: string) => void>();
    fixture.componentInstance.confirmDelete.subscribe((mode) => {
      events(mode);
    });
    fixture.componentInstance.dismiss.subscribe(() => {
      events('dismiss');
    });
    for (const button of await loader.getAllHarnesses(MatButtonHarness)) {
      await button.click();
    }
    expect(events.mock.calls).toEqual([['dismiss'], ['item'], ['tree']]);
  });

  it('offers only the item delete when the tree removes nothing more', async () => {
    const { host, loader } = await setup(false);
    expect(host.querySelector('.tree-summary')).toBeNull();
    expect(await loader.getAllHarnesses(MatButtonHarness)).toHaveLength(2);
  });
});
