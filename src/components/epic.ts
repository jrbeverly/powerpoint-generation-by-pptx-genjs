import type pptxgen from 'pptxgenjs';

import { PROJECT_STATUS_CONSTRAINTS } from '../constraints/archetypes.js';
import type { Epic, Phase } from '../schema/projects.js';
import type { RenderContext } from '../theme/context.js';

import { addIcon } from './icon.js';

/**
 * Explicit placement for an epic line or a phase block (VISION §18).
 * Callers derive these values from `Layout.content` / `Spacing` (VISION §29).
 */
export interface HierarchyPlacement {
  x: number;
  y: number;
  width: number;
}

/**
 * Renders one epic line (VISION §18 level 3): the shared "epic" marker icon
 * plus the epic title at body scale.
 *
 * Icon and line-box sizes are derived from the typography scale (pt → inches)
 * and gaps from the spacing scale — no inline sizes. The line is a pure
 * function of its arguments — repeated calls with the same inputs add the
 * same shapes in the same order (determinism, ADR-0006).
 *
 * @returns the line height used, so `addPhase` can stack epic lines.
 */
export function addEpic(
  slide: pptxgen.Slide,
  ctx: RenderContext,
  epic: Epic,
  placement: HierarchyPlacement,
): number {
  const { typography: T, spacing: S, colors: C } = ctx;

  const iconSize = T.scale.body / 72;
  const lineHeight = (T.scale.body / 72) * T.lineSpacing.loose;

  addIcon(slide, 'epic', {
    x: placement.x,
    y: placement.y + (lineHeight - iconSize) / 2,
    size: iconSize,
  });
  slide.addText(epic.title, {
    x: placement.x + iconSize + S.xs,
    y: placement.y,
    w: placement.width - iconSize - S.xs,
    h: lineHeight,
    fontFace: T.fontFamily,
    fontSize: T.scale.body,
    color: C.textSecondary,
    valign: 'middle',
  });

  return lineHeight;
}

/**
 * Renders one phase / workstream block (VISION §18 level 2): the phase icon,
 * the phase heading, and its epics stacked underneath (via {@link addEpic}).
 *
 * Enforces the epic cap of {@link PROJECT_STATUS_CONSTRAINTS} — a phase with
 * more epics fails loudly instead of being crammed onto the slide: overflow
 * is an input validation problem, not a typography problem (VISION §30, §31).
 * Unknown phase icons fail loudly through the icon catalog (VISION §31).
 *
 * @returns the vertical extent used, so callers can stack phase blocks
 *          without recomputing the layout math.
 */
export function addPhase(
  slide: pptxgen.Slide,
  ctx: RenderContext,
  phase: Phase,
  placement: HierarchyPlacement,
): number {
  if (phase.epics.length > PROJECT_STATUS_CONSTRAINTS.epicsPerPhase.max) {
    throw new Error(
      `addPhase supports at most ${PROJECT_STATUS_CONSTRAINTS.epicsPerPhase.max} epics per phase, ` +
        `got ${phase.epics.length} for "${phase.title}". Split the phase at the epic level — ` +
        'overflow is an input validation problem, not a typography problem (VISION §30).',
    );
  }

  const { typography: T, spacing: S, colors: C } = ctx;

  const phaseIconSize = T.scale.h3 / 72;
  const headingHeight = (T.scale.h3 / 72) * T.lineSpacing.loose;

  // Level 2 — phase icon + heading.
  addIcon(slide, phase.icon, { x: placement.x, y: placement.y, size: phaseIconSize });
  slide.addText(phase.title, {
    x: placement.x + phaseIconSize + S.sm,
    y: placement.y,
    w: placement.width - phaseIconSize - S.sm,
    h: headingHeight,
    fontFace: T.fontFamily,
    fontSize: T.scale.h3,
    bold: true,
    color: C.textPrimary,
    valign: 'middle',
  });

  // Level 3 — epics, indented to align under the phase heading.
  let y = placement.y + headingHeight;
  if (phase.epics.length > 0) {
    y += S.sm;
  }
  for (const epic of phase.epics) {
    const lineHeight = addEpic(slide, ctx, epic, {
      x: placement.x + phaseIconSize,
      y,
      width: placement.width - phaseIconSize,
    });
    y += lineHeight + S.xs;
  }

  return y - placement.y - (phase.epics.length === 0 ? 0 : S.xs);
}
