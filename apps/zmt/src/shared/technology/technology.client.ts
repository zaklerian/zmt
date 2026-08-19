import type { TechnologyDeletePlanResult } from '@contracts';

// The typed renderer-side client over the technology channels the canvas uses.
// Thin by design, exactly like `entityIndexClient` and `lookupLocalisation`: it
// wraps the read channel and nothing more. There is deliberately no delete call
// here — a delete is composed into an ADR 027 batch and committed through
// `entity:writeBatch`, so the script and localisation halves stay atomic (ADR 028
// decision 1); a second write path would be the partial-write hazard that
// boundary exists to remove.
export function technologyDeletePlan(
  id: string,
): Promise<TechnologyDeletePlanResult> {
  return window.api.technology.deletePlan(id);
}
