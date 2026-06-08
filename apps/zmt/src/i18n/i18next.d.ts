import 'i18next';

import type { en as enApp } from './locales/en/app';
import type { en as enFeatureModContent } from './locales/en/feature.mod-content';
import type { en as enFeatureModInfoEdit } from './locales/en/feature.mod-info-edit';
import type { en as enFeaturePluginConfig } from './locales/en/feature.plugin-config';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'app';
    resources: {
      app: typeof enApp;
      'feature.modContent': typeof enFeatureModContent;
      'feature.modInfoEdit': typeof enFeatureModInfoEdit;
      'feature.pluginConfig': typeof enFeaturePluginConfig;
    };
    returnNull: false;
  }
}
