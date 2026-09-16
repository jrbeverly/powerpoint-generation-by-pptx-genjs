import type pptxgen from 'pptxgenjs';

import { resolveIcon } from '../catalog/icons.js';
import type { RenderContext } from '../theme/context.js';

/**
 * Explicit icon placement in inches (PptxGenJS coordinate space).
 *
 * The generic renderer receives its geometry from the caller; callers derive
 * placement from `Layout` / `Spacing` theme constants rather than inline
 * coordinates (VISION §29).
 */
export interface IconPlacement {
  x: number;
  y: number;
  size: number;
}

/**
 * Places a catalog icon on a slide at an explicit position and size.
 *
 * The generic icon primitive (VISION §28): resolves the semantic icon id
 * through the asset catalog (VISION §39) and fails loudly for unknown ids —
 * never renders a placeholder (VISION §31). Icons render as squares, so a
 * single `size` drives both width and height.
 */
export function addIcon(slide: pptxgen.Slide, iconId: string, placement: IconPlacement): void {
  const icon = resolveIcon(iconId);
  slide.addImage({
    data: icon.data,
    x: placement.x,
    y: placement.y,
    w: placement.size,
    h: placement.size,
  });
}

/**
 * Places the primary icon in the application-header slot (VISION §10, §29):
 * the top-left "where am I?" position. All geometry comes from
 * `Layout.header.primaryIcon*`, so changing the header convention in one
 * place changes it everywhere (VISION §28).
 */
export function addPrimaryIcon(slide: pptxgen.Slide, ctx: RenderContext, iconId: string): void {
  const H = ctx.layout.header;
  addIcon(slide, iconId, { x: H.primaryIconX, y: H.primaryIconY, size: H.primaryIconSize });
}
