import { bootstrapApplication } from '@angular/platform-browser';
import { ShellComponent } from '@zmt/renderer/shell/feature';

import { APP_CONFIG } from './app/app-config.const';

bootstrapApplication(ShellComponent, APP_CONFIG).catch((error: unknown) => {
  console.error(error);
});
