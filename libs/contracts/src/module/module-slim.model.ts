// The slim projection of a module — the second `slimProjector` shape, so the
// contract is exercised by two entity types, not fitted to technology alone (ADR
// 024 decision 6). A module has a single `category` (not the plural `categories`
// a technology carries): the slim mirrors the module's own shape rather than
// forcing technology's. `id` is the resolution token (the module name).
export interface ModuleSlim {
  readonly category: string;
  readonly id: string;
  readonly name: string;
}
