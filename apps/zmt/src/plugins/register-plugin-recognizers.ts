import { RendererPlugin } from '@r-game-hoi4';
import { recognizerRegistry } from '@r-recognizer';

export function registerPluginRecognizers(
  plugins: readonly RendererPlugin[],
): void {
  for (const plugin of plugins) {
    for (const recognizer of plugin.recognizers ?? []) {
      recognizerRegistry.register(recognizer);
    }
  }
}
