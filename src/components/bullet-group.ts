import type pptxgen from 'pptxgenjs';

import type { RenderContext } from '../theme/context.js';

/**
 * Maximum bullets in a bullet group (VISION §30).
 *
 * Every archetype that carries supporting bullets caps them at three (themes,
 * metric detail, notices — see `constraints/archetypes.ts`), so the shared
 * component enforces the same cap. Overflow is an input validation problem,
 * not a typography problem: the renderer fails loudly rather than shrinking
 * fonts or overflowing the slide (VISION §31).
 */
export const BULLET_GROUP_MAX_BULLETS = 3;

/**
 * Explicit placement for a bullet group: where the first bullet starts and
 * how wide the lines may be. Callers derive these values from
 * `Layout.content` / `Spacing` (VISION §29).
 */
export interface BulletGroupPlacement {
  x: number;
  y: number;
  width: number;
}

/**
 * Renders a short bullet group (VISION §28): at most
 * {@link BULLET_GROUP_MAX_BULLETS} bullets with consistent, theme-derived
 * line height and spacing.
 *
 * Line height is derived from the body point size and the loose line spacing
 * of the typography scale, and the gap between bullets from the spacing
 * scale — no inline sizes. The component is a pure function of its arguments:
 * repeated calls with the same inputs add the same text boxes in the same
 * order (determinism, ADR-0006).
 *
 * @returns the vertical extent used, so callers can place subsequent content
 *          below the group without recomputing the layout math.
 */
export function addBulletGroup(
  slide: pptxgen.Slide,
  ctx: RenderContext,
  bullets: readonly string[],
  placement: BulletGroupPlacement,
): number {
  if (bullets.length > BULLET_GROUP_MAX_BULLETS) {
    throw new Error(
      `addBulletGroup supports at most ${BULLET_GROUP_MAX_BULLETS} bullets, got ${bullets.length}. ` +
        'Trim the input — overflow is an input validation problem, not a typography problem (VISION §30).',
    );
  }

  const { typography: T, spacing: S, colors: C } = ctx;
  // Line box per bullet, derived from the body point size (pt → inches) and
  // the loose line spacing of the type scale.
  const lineHeight = (T.scale.body / 72) * T.lineSpacing.loose;
  const gap = S.sm;

  let y = placement.y;
  for (const bullet of bullets) {
    slide.addText(`• ${bullet}`, {
      x: placement.x,
      y,
      w: placement.width,
      h: lineHeight,
      fontFace: T.fontFamily,
      fontSize: T.scale.body,
      color: C.textSecondary,
      valign: 'top',
    });
    y += lineHeight + gap;
  }

  return bullets.length === 0 ? 0 : y - placement.y - gap;
}
