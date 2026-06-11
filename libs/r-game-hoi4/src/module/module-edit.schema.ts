import { TranslateFn } from '@r-core';
import { z } from 'zod';

export type ModuleEditFormValues = z.infer<
  ReturnType<typeof buildModuleEditSchema>
>;

export function buildModuleEditSchema(translate: TranslateFn) {
  const bag = bagSchema(translate);
  return z.object({
    add_average_stats: bag,
    add_stats: bag,
    multiply_stats: bag,
    scalars: bag,
  });
}

// One scalar bag: each key non-empty and unique within this bag. Keys may repeat
// across bags, so uniqueness is scoped to the single array. No value validation.
function bagSchema(translate: TranslateFn) {
  return z
    .array(z.object({ key: z.string(), value: z.string() }))
    .superRefine((rows, ctx) => {
      const occurrences = new Map<string, number>();
      for (const row of rows) {
        const key = row.key.trim();
        if (key !== '') {
          occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
        }
      }
      rows.forEach((row, index) => {
        const key = row.key.trim();
        if (key === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: translate(
              'plugin.hoi4:module.form.validation.keyRequired',
            ),
            path: [index, 'key'],
          });
          return;
        }
        if ((occurrences.get(key) ?? 0) > 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: translate(
              'plugin.hoi4:module.form.validation.keyDuplicate',
            ),
            path: [index, 'key'],
          });
        }
      });
    });
}
