import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { PlainEditorComponent } from './plain-editor.component';

describe('PlainEditorComponent', () => {
  async function setup(writable: boolean) {
    const fixture = TestBed.createComponent(PlainEditorComponent);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    fixture.componentRef.setInput('text', 'a = 1');
    fixture.componentRef.setInput('writable', writable);
    fixture.componentRef.setInput('dirty', true);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('renders a read-only surface without actions when not writable', async () => {
    const { host, loader } = await setup(false);
    const surface = host.querySelector('textarea');
    expect(surface?.readOnly).toBe(true);
    expect(surface?.value).toBe('a = 1');
    expect(surface?.getAttribute('aria-label')).toBe(EN_MESSAGES.modContent.editorLabel);
    expect(await loader.getAllHarnesses(MatButtonHarness)).toHaveLength(0);
  });

  it('emits text changes, save and cancel when writable', async () => {
    const { fixture, host, loader } = await setup(true);
    const events = vi.fn<(event: string) => void>();
    fixture.componentInstance.textChange.subscribe((text) => {
      events(text);
    });
    fixture.componentInstance.save.subscribe(() => {
      events('save');
    });
    fixture.componentInstance.discard.subscribe(() => {
      events('discard');
    });

    const surface = host.querySelector('textarea');
    if (surface) {
      surface.value = 'a = 2';
      surface.dispatchEvent(new Event('input'));
    }
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.save' }))).click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.cancel' }))).click();
    expect(events.mock.calls).toEqual([['a = 2'], ['save'], ['discard']]);

    fixture.componentRef.setInput('saveError', { code: 403, message: 'read-only' });
    await fixture.whenStable();
    expect(host.querySelector('[role="alert"]')?.textContent.trim()).toBe('read-only');
  });
});
