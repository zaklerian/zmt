import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { CanvasActionsComponent, flowCaption } from './canvas-actions.component';

describe('flowCaption', () => {
  it('maps error and readonly statuses to captions and the rest to nothing', () => {
    expect(flowCaption({ error: { code: 500, message: 'boom' }, kind: 'error' }, 'E', 'R')).toBe(
      'E boom',
    );
    expect(flowCaption({ kind: 'readonly' }, 'E', 'R')).toBe('R');
    expect(flowCaption({ kind: 'idle' }, 'E', 'R')).toBeNull();
    expect(flowCaption({ kind: 'loading' }, 'E', 'R')).toBeNull();
    expect(flowCaption({ kind: 'deleting' }, 'E', 'R')).toBeNull();
  });
});

describe('CanvasActionsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  async function setup(technologyId: null | string) {
    const fixture = TestBed.createComponent(CanvasActionsComponent);
    fixture.componentRef.setInput('addStatus', { kind: 'idle' });
    fixture.componentRef.setInput('deleteStatus', { kind: 'readonly' });
    fixture.componentRef.setInput('editStatus', { kind: 'idle' });
    fixture.componentRef.setInput('technologyId', technologyId);
    await fixture.whenStable();
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('disables every verb without a selection and shows the delete caption', async () => {
    const { fixture, loader } = await setup(null);
    const buttons = await loader.getAllHarnesses(MatButtonHarness);
    expect(await Promise.all(buttons.map((button) => button.isDisabled()))).toEqual([
      true,
      true,
      true,
    ]);
    const host: unknown = fixture.nativeElement;
    expect(
      host instanceof HTMLElement && host.querySelector('.delete-caption')?.textContent.trim(),
    ).toBe(EN_MESSAGES.techTree.deleteStatusReadonly);
  });

  it('emits the verbs for the selected technology', async () => {
    const { fixture, loader } = await setup('fighter1');
    const events = vi.fn<(event: string) => void>();
    fixture.componentInstance.edit.subscribe(() => {
      events('edit');
    });
    fixture.componentInstance.add.subscribe(() => {
      events('add');
    });
    fixture.componentInstance.deleteTechnology.subscribe(() => {
      events('delete');
    });
    for (const button of await loader.getAllHarnesses(MatButtonHarness)) {
      await button.click();
    }
    expect(events.mock.calls).toEqual([['edit'], ['add'], ['delete']]);
  });
});
