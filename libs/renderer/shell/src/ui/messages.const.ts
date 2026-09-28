import type { Signal } from '@angular/core';
import type { Messages } from '@zmt/shared/i18n';

import { InjectionToken } from '@angular/core';

export const MESSAGES = new InjectionToken<Signal<Messages>>('MESSAGES');
