import { z } from 'zod';

import { pluginConfigSchema } from './plugin-config.schema';

export type PluginConfigFormValues = z.infer<typeof pluginConfigSchema>;
