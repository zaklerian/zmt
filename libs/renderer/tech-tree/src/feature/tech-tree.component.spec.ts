import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { I18nStore } from '@zmt/renderer/shell/data-access';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { TechnologyDeleteStore, TechnologyFormStore, TechTreeStore } from '../data-access';
import { CanvasActionsComponent, CanvasContextMenuComponent, TechTreeCanvasComponent } from '../ui';
import { TechTreeComponent } from './tech-tree.component';

describe('TechTreeComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useFactory: () => inject(I18nStore).messages }],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(TechTreeComponent);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host };
  }

  it('renders the title, chrome and an empty canvas while idle', async () => {
    const { fixture, host } = await setup();
    expect(host.querySelector('h2')?.textContent.trim()).toBe(EN_MESSAGES.techTree.title);
    expect(fixture.debugElement.query(By.directive(TechTreeCanvasComponent))).not.toBeNull();
    expect(host.querySelector('.message')).toBeNull();
  });

  it('shows the loading, error and empty messages instead of the canvas', async () => {
    const tree = TestBed.inject(TechTreeStore);
    patchState(unprotected(tree), { status: { kind: 'loading' } });
    const { fixture, host } = await setup();
    expect(host.querySelector('.message')?.textContent.trim()).toBe(EN_MESSAGES.techTree.loading);
    patchState(unprotected(tree), {
      status: { error: { code: 500, message: 'x' }, kind: 'error' },
    });
    await fixture.whenStable();
    expect(host.querySelector('.message')?.textContent.trim()).toBe(EN_MESSAGES.techTree.error);
    patchState(unprotected(tree), { status: { kind: 'success' } });
    await fixture.whenStable();
    expect(host.querySelector('.message')?.textContent.trim()).toBe(EN_MESSAGES.techTree.empty);
  });

  it('ignores the panel verbs while nothing is selected', async () => {
    const form = TestBed.inject(TechnologyFormStore);
    const openEdit = vi
      .spyOn(form, 'openEdit')
      .mockImplementation(() => ({ destroy: () => undefined }));
    const openAddChild = vi
      .spyOn(form, 'openAddChild')
      .mockImplementation(() => ({ destroy: () => undefined }));
    const openDelete = vi
      .spyOn(TestBed.inject(TechnologyDeleteStore), 'open')
      .mockImplementation(() => ({ destroy: () => undefined }));
    const { fixture } = await setup();
    const actions = fixture.debugElement
      .query(By.directive(CanvasActionsComponent))
      .injector.get(CanvasActionsComponent);
    actions.add.emit();
    actions.deleteTechnology.emit();
    actions.edit.emit();
    expect(openEdit).not.toHaveBeenCalled();
    expect(openAddChild).not.toHaveBeenCalled();
    expect(openDelete).not.toHaveBeenCalled();
  });

  it('opens the context menu from the canvas and dispatches the verbs to the stores', async () => {
    const tree = TestBed.inject(TechTreeStore);
    patchState(unprotected(tree), { selectedId: 'fighter1' });
    const form = TestBed.inject(TechnologyFormStore);
    const openEdit = vi
      .spyOn(form, 'openEdit')
      .mockImplementation(() => ({ destroy: () => undefined }));
    const openAddChild = vi
      .spyOn(form, 'openAddChild')
      .mockImplementation(() => ({ destroy: () => undefined }));
    const openDelete = vi
      .spyOn(TestBed.inject(TechnologyDeleteStore), 'open')
      .mockImplementation(() => ({ destroy: () => undefined }));
    const { fixture } = await setup();

    const canvas = fixture.debugElement
      .query(By.directive(TechTreeCanvasComponent))
      .injector.get(TechTreeCanvasComponent);
    canvas.nodeContextMenu.emit({ anchor: { x: 1, y: 2 }, id: 'fighter1' });
    await fixture.whenStable();
    const menu = fixture.debugElement
      .query(By.directive(CanvasContextMenuComponent))
      .injector.get(CanvasContextMenuComponent);
    expect(menu.technologyId()).toBe('fighter1');
    menu.edit.emit('fighter1');
    await fixture.whenStable();
    expect(openEdit).toHaveBeenCalledWith('fighter1');
    expect(fixture.debugElement.query(By.directive(CanvasContextMenuComponent))).toBeNull();

    const actions = fixture.debugElement
      .query(By.directive(CanvasActionsComponent))
      .injector.get(CanvasActionsComponent);
    actions.add.emit();
    actions.deleteTechnology.emit();
    actions.edit.emit();
    expect(openAddChild).toHaveBeenCalledWith('fighter1');
    expect(openDelete).toHaveBeenCalledWith('fighter1');
    expect(openEdit).toHaveBeenCalledTimes(2);

    canvas.paneContextMenu.emit({ x: 3, y: 4 });
    await fixture.whenStable();
    const paneMenu = fixture.debugElement
      .query(By.directive(CanvasContextMenuComponent))
      .injector.get(CanvasContextMenuComponent);
    expect(paneMenu.technologyId()).toBeNull();
    paneMenu.dismiss.emit();
    await fixture.whenStable();
    expect(fixture.debugElement.query(By.directive(CanvasContextMenuComponent))).toBeNull();
  });
});
