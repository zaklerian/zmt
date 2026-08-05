import { parse } from '@paradox-parser';
import { describe, expect, it } from 'vitest';

import { projectTechTreeGeometry } from './project-tech-tree-geometry.util';

// A real-shape excerpt of `interface/countrytechtreeview.gui` (BICE), reduced to
// the render-relevant handful this projection reads and preserving the exact
// nesting: `guiTypes` → `countrytechtreeview` → folder containers, each folder's
// gridboxes as direct children, and `techtree_stripes` (background iconType + year
// gutter) one level deeper. `air_techs_folder` keeps BICE's two divergent gridbox
// origins and the `"1945"`/`YEAR_1946` label quirk; `land_doctrine_folder` keeps
// the doctrine shape (no stripes, no gridbox, year labels in `offensive_years`).
const GUI = `
guiTypes = {
	containerWindowType = {
		name = "countrytechtreeview"
		position = { x = -3 y = 113 }
		size = { width = 100%% height = 100%% }
		background = {
			name = "Background"
			quadTextureSprite = "GFX_tiled_plain_bg2"
		}
		containerWindowType = {
			name = "air_techs_folder"
			position = { x=0 y=47 }
			size = { width = 100%% height = 100%% }
			background = {
				name = "Background"
				quadTextureSprite = "GFX_tiled_window_2b_border"
			}
			containerWindowType = {
				name = "techtree_stripes"
				position = { x= 0 y= 0 }
				size = {
					width = 3720 height = 1300
					min = { width=100%% height=100%% }
				}
				background = {
					name = "Background"
					quadTextureSprite = "GFX_techtree_stripes"
				}
				iconType = {
					name = "air_techs_techtree_bg"
					spriteType = "GFX_air_techtree_bg"
					position = { x=0 y=0 }
				}
				containerWindowType = {
					name = "air_techs_years_left"
					position = { x= 0 y= 0 }
					instantTextBoxType = {
						name = "airtech_year3"
						position = { x = 10 y = 280 }
						text = "1936"
						pdx_tooltip = YEAR_1936
					}
					instantTextBoxType = {
						name = "airtech_year6"
						position = { x = 10 y = 700 }
						text = "1945"
						pdx_tooltip = YEAR_1946
					}
				}
			}
			instantTextBoxType = {
				name = "airtech_subtitle_fighter"
				position = { x = 740 y = 90 }
				text = "AIR_TITLE_FIGHTER"
			}
			gridboxtype = {
				name = "generic_fighter_tree"
				position = { x = 340 y = 32 }
				size = { width = 400 height = 1000 }
				slotsize = { width = 70 height = 70 }
				format = "UP"
			}
			gridboxtype = {
				name = "generic_strategic_bomber_tree"
				position = { x = 1610 y = 32 }
				size = { width = 200 height = 1000 }
				slotsize = { width = 70 height = 70 }
				format = "UP"
			}
		}
		containerWindowType = {
			name = "land_doctrine_folder"
			position = { x=0 y=47 }
			size = { width = 100%% height = 100%% }
			containerWindowType = {
				name = "offensive_years"
				position = { x = 250 y = 0 }
				instantTextBoxType = {
					name = "doctrine_year_1"
					position = { x = 0 y = 120 }
					text = "1918"
				}
			}
		}
	}
}
`;

describe('projectTechTreeGeometry', () => {
  const folders = projectTechTreeGeometry(parse(GUI, { dialects: [] }));

  it('keys geometry by the folder container name a technology.folder.name matches', () => {
    // BICE grounding: a technology carries `folder.name = air_techs_folder` (the
    // full container name), not the bare `air_techs` — the key is verbatim.
    expect(Object.keys(folders).sort()).toEqual([
      'air_techs_folder',
      'land_doctrine_folder',
    ]);
    expect(folders.air_techs_folder?.folderId).toBe('air_techs_folder');
  });

  it('places a real air technology at origin + cell × step (gate 4)', () => {
    const air = folders.air_techs_folder;
    const grid = air?.gridboxes.find((g) => g.name === 'generic_fighter_tree');
    expect(grid).toBeDefined();
    expect(grid?.origin).toEqual({ x: 340, y: 32 });
    expect(grid?.step).toEqual({ height: 70, width: 70 });
    expect(grid?.axis).toBe('UP');

    // `generic_fighter`: folder.name = air_techs_folder, position { x = @FTR_START
    // y = @1933 }; air_techs.txt resolves @FTR_START = 5, @1933 = 2 (E24). The
    // canvas composes the pixel origin from the model's origin/step:
    const cell = { x: 5, y: 2 };
    const pixel = {
      x: (grid?.origin.x ?? 0) + cell.x * (grid?.step.width ?? 0),
      y: (grid?.origin.y ?? 0) + cell.y * (grid?.step.height ?? 0),
    };
    expect(pixel).toEqual({ x: 690, y: 172 });
  });

  it('carries a folder gridbox LIST because air gridboxes do NOT share an origin', () => {
    // The ADR 025 divergence: `air_techs_folder` declares gridboxes at distinct
    // origins, so a single collapsed per-folder origin would misplace nodes.
    const origins = folders.air_techs_folder?.gridboxes.map((g) => g.origin);
    expect(origins).toEqual([
      { x: 340, y: 32 },
      { x: 1610, y: 32 },
    ]);
  });

  it('reads the tech-area extent and background sprite reference, not the image', () => {
    expect(folders.air_techs_folder?.area).toEqual({
      height: 1300,
      width: 3720,
    });
    // The per-folder iconType sprite, not the shared `GFX_techtree_stripes`
    // container texture; resolving it to pixels is out of scope.
    expect(folders.air_techs_folder?.background).toBe('GFX_air_techtree_bg');
  });

  it('reads the year gutter as explicit labels keeping text, tooltip, position distinct', () => {
    // Step 1 grounding: candidate (a) — explicit labels, not derived from
    // @-symbols. The `"1945"` text under tooltip `YEAR_1946` proves printed text,
    // gutter-year token, and cell row are three distinct quantities.
    expect(folders.air_techs_folder?.yearAxis).toEqual([
      { position: { x: 10, y: 280 }, text: '1936', tooltip: 'YEAR_1936' },
      { position: { x: 10, y: 700 }, text: '1945', tooltip: 'YEAR_1946' },
    ]);
  });

  it('projects a doctrine folder tolerantly — no stripes, no gridbox, year labels only', () => {
    const doctrine = folders.land_doctrine_folder;
    expect(doctrine?.area).toBeNull();
    expect(doctrine?.background).toBeNull();
    expect(doctrine?.gridboxes).toEqual([]);
    expect(doctrine?.yearAxis).toEqual([
      { position: { x: 0, y: 120 }, text: '1918', tooltip: null },
    ]);
  });

  it('returns an empty map when the root container is absent', () => {
    expect(
      projectTechTreeGeometry(parse('guiTypes = {}', { dialects: [] })),
    ).toEqual({});
  });
});
