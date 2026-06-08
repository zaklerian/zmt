import { z } from 'zod';

import { resolveSchemaForPlugin } from './mod-info-edit.schema';

export type ModDescriptorFormValues = z.infer<ResolvedModDescriptorSchema>;

export type ResolvedModDescriptorSchema = ReturnType<
  typeof resolveSchemaForPlugin
>;
