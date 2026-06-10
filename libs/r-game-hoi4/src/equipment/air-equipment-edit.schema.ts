import { TranslateFn } from '@r-core';
import { z } from 'zod';

export type AirEquipmentFormValues = z.infer<
  ReturnType<typeof buildAirEquipmentSchema>
>;

export function buildAirEquipmentSchema(translate: TranslateFn) {
  return z.object({
    rows: z
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
                'plugin.hoi4:equipment.form.validation.keyRequired',
              ),
              path: ['rows', index, 'key'],
            });
            return;
          }
          if ((occurrences.get(key) ?? 0) > 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: translate(
                'plugin.hoi4:equipment.form.validation.keyDuplicate',
              ),
              path: ['rows', index, 'key'],
            });
          }
        });
      }),
  });
}
