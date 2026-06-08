import type { ModDescriptorSchemaExtension } from '@contracts';

import { z } from 'zod';

export const baseModDescriptorSchema = z.object({
  name: z.string().default(''),
  path: z.string().default(''),
  picture: z.string().default(''),
  supported_version: z.string().default(''),
  tags: z.array(z.string()).default([]),
  version: z.string().default(''),
});

export type BaseModDescriptorSchema = typeof baseModDescriptorSchema;

interface PluginSchemaCarrier {
  readonly modDescriptorSchemaExtension?: ModDescriptorSchemaExtension;
}

export function resolveSchemaForPlugin(
  plugin: PluginSchemaCarrier,
): z.ZodObject<z.ZodRawShape> {
  const extension = (plugin.modDescriptorSchemaExtension ??
    {}) as z.ZodRawShape;
  return baseModDescriptorSchema.extend({ ...extension });
}
