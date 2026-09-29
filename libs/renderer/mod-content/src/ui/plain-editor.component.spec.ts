import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { PlainEditorComponent } from './plain-editor.component';

describe('PlainEditorComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGES, useValue: signal(EN_MESSAGES) }],
    });
  });

  async function setup(writable: boolean) {
    const fixture = TestBed.createComponent(PlainEditorComponent);
    fixture.componentRef.setInput('text', 'a = 1');
    fixture.componentRef.setInput('writable', writable);
    fixture.componentRef.setInput('dirty', true);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    const surface = host.querySelector('textarea');
    if (surface === null) {
      throw new TypeError('editor surface not rendered');
    }
    return { fixture, host, loader: TestbedHarnessEnvironment.loader(fixture), surface };
  }

  it('renders a read-only surface without actions when not writable', async () => {
    const { host, loader, surface } = await setup(false);
    expect(surface.readOnly).toBe(true);
    expect(surface.value).toBe('a = 1');
    expect(surface.getAttribute('aria-label')).toBe(EN_MESSAGES.modContent.editorLabel);
    expect(await loader.getAllHarnesses(MatButtonHarness)).toHaveLength(0);
    expect(host.querySelector('[role="alert"]')).toBeNull();
  });

  it('writes typed text into the model and emits save and cancel when writable', async () => {
    const { fixture, host, loader, surface } = await setup(true);
    const events = vi.fn<(event: string) => void>();
    fixture.componentInstance.text.subscribe((text) => {
      events(text);
    });
    fixture.componentInstance.save.subscribe(() => {
      events('save');
    });
    fixture.componentInstance.discard.subscribe(() => {
      events('discard');
    });
    expect(surface.readOnly).toBe(false);

    surface.value = 'a = 2';
    surface.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.text()).toBe('a = 2');
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.save' }))).click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.cancel' }))).click();
    expect(events.mock.calls).toEqual([['a = 2'], ['save'], ['discard']]);

    fixture.componentRef.setInput('text', 'a = 3');
    await fixture.whenStable();
    expect(surface.value).toBe('a = 3');
    expect(events.mock.calls).toHaveLength(3);

    fixture.componentRef.setInput('saveError', { code: 403, message: 'read-only' });
    await fixture.whenStable();
    expect(host.querySelector('[role="alert"]')?.textContent.trim()).toBe('read-only');
  });

  it('disables the actions while not dirty or while saving', async () => {
    const { fixture, loader } = await setup(true);
    const save = await loader.getHarness(MatButtonHarness.with({ selector: '.save' }));
    const cancel = await loader.getHarness(MatButtonHarness.with({ selector: '.cancel' }));
    expect(await save.isDisabled()).toBe(false);
    fixture.componentRef.setInput('dirty', false);
    expect(await save.isDisabled()).toBe(true);
    expect(await cancel.isDisabled()).toBe(true);
    fixture.componentRef.setInput('dirty', true);
    fixture.componentRef.setInput('saving', true);
    expect(await save.isDisabled()).toBe(true);
    expect(await cancel.isDisabled()).toBe(true);
  });
});
