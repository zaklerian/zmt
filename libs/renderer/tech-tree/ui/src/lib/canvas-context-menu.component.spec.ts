import { TestBed } from '@angular/core/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { CanvasContextMenuComponent } from './canvas-context-menu.component';

describe('CanvasContextMenuComponent', () => {
  async function setup(technologyId: null | string) {
    const fixture = TestBed.createComponent(CanvasContextMenuComponent);
    fixture.componentRef.setInput('anchor', { x: 40, y: 50 });
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('technologyId', technologyId);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host };
  }

  it('offers edit, add prerequisite and delete for a node and emits its id', async () => {
    const { fixture, host } = await setup('fighter1');
    const events = vi.fn<(event: string) => void>();
    fixture.componentInstance.edit.subscribe((id) => {
      events(`edit:${id}`);
    });
    fixture.componentInstance.addChild.subscribe((id) => {
      events(`add:${id}`);
    });
    fixture.componentInstance.deleteTechnology.subscribe((id) => {
      events(`delete:${id}`);
    });
    fixture.componentInstance.dismiss.subscribe(() => {
      events('dismiss');
    });

    const items = [...host.querySelectorAll('[role="menuitem"]')];
    expect(items.map((item) => item.textContent.trim())).toEqual([
      EN_MESSAGES.techTree.edit,
      EN_MESSAGES.techTree.addChild,
      EN_MESSAGES.techTree.delete,
    ]);
    for (const item of items) {
      item.dispatchEvent(new MouseEvent('click'));
    }
    host.querySelector('.menu')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(events.mock.calls).toEqual([
      ['edit:fighter1'],
      ['add:fighter1'],
      ['delete:fighter1'],
      ['dismiss'],
    ]);
    const menu = host.querySelector('.menu');
    expect(menu instanceof HTMLElement && menu.style.left).toBe('40px');
  });

  it('offers only the free placement on the empty zone', async () => {
    const { fixture, host } = await setup(null);
    const addFree = vi.fn();
    fixture.componentInstance.addFree.subscribe(addFree);
    const items = [...host.querySelectorAll('[role="menuitem"]')];
    expect(items.map((item) => item.textContent.trim())).toEqual([EN_MESSAGES.techTree.addFree]);
    items[0]?.dispatchEvent(new MouseEvent('click'));
    expect(addFree).toHaveBeenCalledTimes(1);
  });
});
