import { z } from 'zod';

export const pluginConfigSchema = z.object({
  activeGameId: z.string(),
  features: z.record(z.string(), z.boolean()),
});
