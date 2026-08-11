import 'i18next';

import type { en as enApp } from './locales/en/app';
import type { en as enFeatureAppSettings } from './locales/en/feature.app-settings';
import type { en as enFeatureEntityForm } from './locales/en/feature.entity-form';
import type { en as enFeatureModContent } from './locales/en/feature.mod-content';
import type { en as enFeatureModInfoEdit } from './locales/en/feature.mod-info-edit';
import type { en as enFeatureTechTreeCanvas } from './locales/en/feature.tech-tree-canvas';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'app';
    resources: {
      app: typeof enApp;
      'feature.appSettings': typeof enFeatureAppSettings;
      'feature.entityForm': typeof enFeatureEntityForm;
      'feature.modContent': typeof enFeatureModContent;
      'feature.modInfoEdit': typeof enFeatureModInfoEdit;
      'feature.techTreeCanvas': typeof enFeatureTechTreeCanvas;
    };
    returnNull: false;
  }
}
