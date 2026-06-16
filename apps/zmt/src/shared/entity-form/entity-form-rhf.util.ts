import { EntityFormBlock, EntityFormRow, fieldName } from '@r-core';
import { z } from 'zod';

import { lowerFieldSpec } from './field-spec-to-zod.util';

export interface BagMessages {
  readonly keyDuplicate: string;
  readonly keyRequired: string;
}

const toRow = (row: EntityFormRow): { key: string; value: string } => ({
  key: row.key,
  // A form row is always a concrete scalar; an absent value (the bare-token
  // marker on EntityField) cannot occur here and binds as the empty string.
  value: row.value ?? '',
});

// Seeds RHF default values from the descriptor's blocks. Open bags and named
// nested maps seed a key→value field-array under their `name`; fixed fields
// seed one root key per field; a list block seeds its string array.
export function buildEntityFormDefaults(
  blocks: readonly EntityFormBlock[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const block of blocks) {
    if (block.kind === 'listOfScalars') {
      values[block.name] = [...block.values];
    } else if (block.kind === 'namedNested') {
      values[block.name] = block.rows.map(toRow);
      for (const child of block.listChildren ?? []) {
        values[child.name] = [...child.values];
      }
      for (const child of block.namedChildren ?? []) {
        values[child.name] = child.rows.map(toRow);
      }
    } else if (block.members.mode === 'open') {
      values[block.members.name] = block.members.rows.map(toRow);
    } else {
      for (const field of block.members.fields) {
        values[fieldName(field.spec)] = field.value;
      }
    }
  }
  return values;
}

// Generates the RHF resolver schema from the blocks' field specs, used when the
// descriptor does not supply an external schema. Open bags and named maps share
// the key-required / key-unique bag schema; fixed fields lower per spec; list
// blocks accept a string array.
export function buildEntityFormSchema(
  blocks: readonly EntityFormBlock[],
  messages: BagMessages,
): z.ZodTypeAny {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const block of blocks) {
    if (block.kind === 'listOfScalars') {
      shape[block.name] = z.array(z.string());
    } else if (block.kind === 'namedNested') {
      shape[block.name] = bagSchema(messages);
      for (const child of block.listChildren ?? []) {
        shape[child.name] = z.array(z.string());
      }
      for (const child of block.namedChildren ?? []) {
        shape[child.name] = bagSchema(messages);
      }
    } else if (block.members.mode === 'open') {
      shape[block.members.name] = bagSchema(messages);
    } else {
      for (const field of block.members.fields) {
        shape[fieldName(field.spec)] = lowerFieldSpec(field.spec);
      }
    }
  }
  return z.object(shape);
}

// One scalar bag: each key non-empty and unique within this bag. Keys may
// repeat across bags, so uniqueness is scoped to the single array. No value
// validation — open bags carry no per-key field specs.
function bagSchema(messages: BagMessages): z.ZodTypeAny {
  return z
    .array(z.object({ key: z.string(), value: z.string() }))
    .superRefine((rows, ctx) => {
      const occurrences = new Map<string, number>();
      for (const row of rows) {
        const key = row.key.trim();
        if (key !== '') occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
      }
      rows.forEach((row, index) => {
        const key = row.key.trim();
        if (key === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.keyRequired,
            path: [index, 'key'],
          });
          return;
        }
        if ((occurrences.get(key) ?? 0) > 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.keyDuplicate,
            path: [index, 'key'],
          });
        }
      });
    });
}
