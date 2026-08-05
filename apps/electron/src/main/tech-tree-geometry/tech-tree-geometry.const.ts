// Grounded against BICE (ZMT-38 Step 1): `interface/countrytechtreeview.gui` is
// the sole `.gui` that declares a container for every folder a technology's
// `folder.name` references — 33 of the 34 referenced folders; the 34th,
// `minorairb_folder`, is a BICE data defect (a USA_air technology pointing at a
// folder no `.gui` declares, absent from `countrydoctrinetreeview.gui` too).
// `countrydoctrinetreeview.gui` re-declares only the three shared doctrine folders
// for the SEPARATE doctrine screen and is not a dependency of the tech-tree canvas.
// A list (not a scalar) leaves the door open should a future corpus split the view
// across files, without over-accommodating today (A-PROJ-3).
export const TREE_VIEW_GUI_PATHS = [
  'interface/countrytechtreeview.gui',
] as const;
