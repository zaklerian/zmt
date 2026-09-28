import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatFormFieldHarness } from '@angular/material/form-field/testing';
import { MatInputModule } from '@angular/material/input';
import { MatInputHarness } from '@angular/material/input/testing';

interface ModProfile {
  readonly name: string;
  readonly tags: readonly string[];
}

@Component({
  imports: [FormField, MatFormFieldModule, MatInputModule],
  selector: 'zmt-signal-form-host',
  template: `
    <mat-form-field>
      <mat-label>{{ label }}</mat-label>
      <input matInput [formField]="profileForm.name" />
    </mat-form-field>
  `,
})
class SignalFormHostComponent {
  readonly label = 'name';
  readonly profile = signal<ModProfile>({ name: 'base', tags: ['core'] });
  readonly profileForm = form(this.profile, (path) => {
    required(path.name);
  });
}

describe('Signal Forms over a readonly model (ARCH-7)', () => {
  it('binds a readonly model to a Material form field in both directions', async () => {
    const fixture = TestBed.createComponent(SignalFormHostComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    const input = await loader.getHarness(MatInputHarness);
    const field = await loader.getHarness(MatFormFieldHarness);

    expect(await input.getValue()).toBe('base');

    await input.setValue('renamed');
    expect(fixture.componentInstance.profile()).toEqual({ name: 'renamed', tags: ['core'] });

    fixture.componentInstance.profile.set({ name: 'external', tags: ['core'] });
    expect(await input.getValue()).toBe('external');

    await input.setValue('');
    await input.blur();
    expect(fixture.componentInstance.profileForm.name().invalid()).toBe(true);
    expect(await field.isControlValid()).toBe(false);
  });
});
