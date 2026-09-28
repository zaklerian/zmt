import { InjectionToken } from '@angular/core';

import type { NavEntry } from './navigation.model';

export const NAV_ENTRIES = new InjectionToken<readonly NavEntry[]>('NAV_ENTRIES');
