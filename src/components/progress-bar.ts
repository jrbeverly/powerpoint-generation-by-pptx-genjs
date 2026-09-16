import type pptxgen from 'pptxgenjs';

import type { RenderContext } from '../theme/context.js';

/**
 * Emphasis states of a metric progress bar (VISION §16).
 *
 * `"selected"` draws the bar at full accent strength — the slide is moving
 * the audience's attention to this metric. `"muted"` draws a dimmed bar so
 * the other metrics read as de-emphasized. The metric-selected archetype
 * renders one selected bar and mutes the rest (VISION §16).
 */
export type ProgressBarEmphasis = 'selected' | 'muted';

/**
 * Explicit placement for a progress bar. Callers derive these values from
 * `Layout.content` / `Spacing` (VISION §29).
 */
export interface ProgressBarPlacement {
  x: number;
  y: number;
  width: number;
  /** Bar thickness; defaults to {@link PROGRESS_BAR_HEIGHT}. */
  height?: number;
}

/**
 * Semantic content of a progress bar: the 0–100 fill fraction and its
 * emphasis state (VISION §16).
 */
export interface ProgressBarContent {
  /** Fill fraction in the 0–100 range; values outside the range are clamped. */
  value: number;
  /** Emphasis state; defaults to `"selected"`. */
  emphasis?: ProgressBarEmphasis;
}

/** Default bar thickness (inches). */
const PROGRESS_BAR_HEIGHT = 0.12;

/** Dimming applied to muted bars (0–100 transparency). */
const MUTED_TRANSPARENCY = 40;

/**
 * Renders a metric progress bar (VISION §16, §28): a full-width track plus a
 * fill whose length is proportional to the 0–100 value.
 *
 * The selected fill uses the active accent (`productTheme.accent` when
 * present, the base accent otherwise); the muted fill uses the muted text
 * color at reduced opacity. All geometry comes from the explicit placement
 * (with a theme-derived default thickness) and all colors from
 * `ctx.colors` / `ctx.productTheme`. The bar is a pure function of its
 * arguments — repeated calls with the same inputs add the same shapes in the
 * same order (determinism, ADR-0006).
 */
export function addProgressBar(
  pptx: pptxgen,
  slide: pptxgen.Slide,
  ctx: RenderContext,
  placement: ProgressBarPlacement,
  content: ProgressBarContent,
): void {
  const { colors: C, productTheme } = ctx;
  const height = placement.height ?? PROGRESS_BAR_HEIGHT;
  const emphasis = content.emphasis ?? 'selected';
  const clamped = Math.max(0, Math.min(100, content.value));

  // Track: the full bar extent, always drawn (VISION §16).
  slide.addShape(pptx.ShapeType.rect, {
    x: placement.x,
    y: placement.y,
    w: placement.width,
    h: height,
    fill: { color: C.backgroundMid },
    line: { type: 'none' },
  });

  // Fill: proportional to the value; a 0 (or clamped-below-0) value renders
  // the track alone.
  const fillWidth = placement.width * (clamped / 100);
  if (fillWidth > 0) {
    const selected = emphasis === 'selected';
    slide.addShape(pptx.ShapeType.rect, {
      x: placement.x,
      y: placement.y,
      w: fillWidth,
      h: height,
      fill: {
        color: selected ? (productTheme?.accent ?? C.accent) : C.textMuted,
        transparency: selected ? 0 : MUTED_TRANSPARENCY,
      },
      line: { type: 'none' },
    });
  }
}
