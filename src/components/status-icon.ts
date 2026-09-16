import type pptxgen from 'pptxgenjs';

import type { Status } from '../schema/common.js';
import type { RenderContext } from '../theme/context.js';

import { addIcon } from './icon.js';

/**
 * Optional explicit placement for a status indicator. When omitted, the
 * indicator is drawn in the application-header state slot (VISION §10):
 * `Layout.header.stateRight` / `stateIconY` / `stateIconSize`.
 */
export interface StatusIndicatorPlacement {
  x: number;
  y: number;
  size: number;
}

/**
 * Places the status icon for a semantic state (VISION §8, §39):
 * healthy / attention / blocked / complete / upcoming.
 *
 * Status icons answer "what state is it in?" and carry their semantic color
 * in the artwork, so no color is applied here. The default placement is the
 * top-right state slot of the application-like header; callers may override
 * the placement for in-content use (e.g. next to a metric or project).
 */
export function addStatusIndicator(
  slide: pptxgen.Slide,
  ctx: RenderContext,
  status: Status,
  placement?: Partial<StatusIndicatorPlacement>,
): void {
  const H = ctx.layout.header;
  addIcon(slide, status, {
    x: placement?.x ?? H.stateRight,
    y: placement?.y ?? H.stateIconY,
    size: placement?.size ?? H.stateIconSize,
  });
}
