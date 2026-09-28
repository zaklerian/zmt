import type { FeatureContribution, GameId, GamePlugin } from '@zmt/contracts';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input, model, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { type MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { type FeatureToggles, isFeatureEnabled } from '@zmt/renderer/app-settings/util';

@Component({
  imports: [MatFormFieldModule, MatSelectModule, MatSlideToggleModule],
  selector: 'zmt-plugin-config-form',
  styles: `
    .features {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 4px;
    }
  `,
  templateUrl: './plugin-config-form.component.html',
})
export class PluginConfigFormComponent {
  readonly activePlugin = input<GamePlugin | null>(null);
  readonly features = model<FeatureToggles>({});
  readonly gameChange = output<GameId>();
  readonly messages = input.required<Messages>();
  readonly plugins = input.required<readonly GamePlugin[]>();

  protected isEnabled(feature: FeatureContribution): boolean {
    return isFeatureEnabled(this.features(), feature);
  }

  protected onGameChange(change: MatSelectChange): void {
    const value: unknown = change.value;
    const plugin = this.plugins().find((candidate) => candidate.gameId === value);
    if (plugin) {
      this.gameChange.emit(plugin.gameId);
    }
  }

  protected toggle(featureId: string, checked: boolean): void {
    this.features.update((current) => ({ ...current, [featureId]: checked }));
  }
}
