import type { TechTreeGeometry } from '@contracts';

// Thin typed renderer client over the `techTreeGeometry:read` channel (ADR 025):
// the folder-keyed geometry map projected from the tree-view `.gui`. Its own
// channel, not `index:list` — geometry is a resolved-file config singleton, not an
// index entity. The canvas consumes this later and selects one folder by a
// technology's `folder.name`; the client adds no logic beyond the call.
export const techTreeGeometryClient = {
  read(): Promise<TechTreeGeometry> {
    return window.api.techTreeGeometry.read();
  },
};
