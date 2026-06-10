import { recognizerRegistry } from '@r-core';
import { RendererPlugin } from '@r-game-hoi4';

export function registerPluginRecognizers(
  plugins: readonly RendererPlugin[],
): void {
  for (const plugin of plugins) {
    for (const recognizer of plugin.recognizers ?? []) {
      recognizerRegistry.register(recognizer);
    }
  }
}
