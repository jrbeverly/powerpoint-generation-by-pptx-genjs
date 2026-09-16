import type pptxgen from 'pptxgenjs';

import { formatMetricValue, getMetricDefinition } from '../catalog/metrics.js';
import type { Status, Trend } from '../schema/common.js';
import type { MetricId } from '../schema/metrics.js';
import type { BaseColors } from '../theme/colors.js';
import type { RenderContext } from '../theme/context.js';

import { addIcon } from './icon.js';
import { addStatusIndicator } from './status-icon.js';

/**
 * Standard in-content metric icon size. Matches the header icon slots so
 * icons share one visual weight across the deck (visual continuity, VISION §40).
 */
const METRIC_ICON_SIZE = 0.45;

/** Small in-content status icon for the card's top-right corner. */
const METRIC_STATUS_SIZE = 0.3;

/**
 * Semantic content of a metric card (VISION §15, §17): the bare metric id and
 * value plus optional trend / state.
 *
 * Labels, icons, units, and precision all resolve from the metric catalog
 * (VISION §14) — never from this input. The JSON supplies only the id, the
 * number, and the semantic direction.
 */
export interface MetricContent {
  /** Catalog metric id; the definition supplies icon, label, and formatting. */
  metric: MetricId;
  /** Bare numeric value; the catalog definition formats it. */
  value: number;
  /** Optional trend vs. the prior sprint, rendered as an arrow glyph. */
  trend?: Trend;
  /** Optional state indicator in the card's top-right corner. */
  status?: Status;
}

/**
 * Explicit placement for a metric card. Callers derive these values from
 * `Layout.content` / `Spacing` (VISION §29).
 */
export interface MetricPlacement {
  x: number;
  y: number;
  width: number;
}

/**
 * Presentation options for `addMetric`.
 */
export interface MetricOptions {
  /** Square icon size; defaults to {@link METRIC_ICON_SIZE}. */
  iconSize?: number;
  /** Compact catalog label for grid layouts (default) or the full catalog label for detail slides (VISION §15, §17). */
  labelStyle?: 'short' | 'full';
}

/** Trend arrow color: state colors for movement, muted for flat (VISION §17). */
function trendColor(colors: BaseColors, trend: Trend): string {
  if (trend === 'up') {
    return colors.healthy;
  }
  if (trend === 'down') {
    return colors.blocked;
  }
  return colors.textMuted;
}

/**
 * Renders a metric card (VISION §15, §17, §28): catalog icon + formatted
 * value + catalog label, with an optional trend arrow and state indicator.
 *
 * Every identity and formatting decision — icon asset, label text, unit,
 * precision, trend glyph — is resolved through the metric catalog via
 * {@link getMetricDefinition} / {@link formatMetricValue}; unknown metric ids
 * fail loudly instead of rendering a placeholder (VISION §31). Geometry and
 * styles come from the render context (`ctx.typography`, `ctx.spacing`,
 * `ctx.colors`) and the explicit placement. The card is a pure function of
 * its arguments — repeated calls with the same inputs add the same shapes in
 * the same order (determinism, ADR-0006).
 *
 * @returns the vertical extent used, so callers can stack cards in a grid
 *          without recomputing the layout math.
 */
export function addMetric(
  slide: pptxgen.Slide,
  ctx: RenderContext,
  content: MetricContent,
  placement: MetricPlacement,
  options: MetricOptions = {},
): number {
  const { typography: T, spacing: S, colors: C } = ctx;
  const definition = getMetricDefinition(content.metric);

  const iconSize = options.iconSize ?? METRIC_ICON_SIZE;
  const label = options.labelStyle === 'full' ? definition.label : definition.shortLabel;
  const value = formatMetricValue(definition, content.value);

  // Catalog icon on the left of the card (VISION §14, §40).
  addIcon(slide, content.metric, { x: placement.x, y: placement.y, size: iconSize });

  // Formatted value with an optional trend glyph from the catalog's shared
  // arrow set (VISION §17); trend color comes from the state palette.
  const valueRuns: pptxgen.TextProps[] = [{ text: value, options: { bold: true } }];
  if (content.trend !== undefined) {
    valueRuns.push({
      text: ` ${definition.formatting.trendArrows[content.trend]}`,
      options: { color: trendColor(C, content.trend) },
    });
  }
  const statusWidth = content.status === undefined ? 0 : METRIC_STATUS_SIZE + S.xs;
  slide.addText(valueRuns, {
    x: placement.x + iconSize + S.sm,
    y: placement.y,
    w: placement.width - iconSize - S.sm - statusWidth,
    h: iconSize,
    fontFace: T.fontFamily,
    fontSize: T.scale.h2,
    color: C.textPrimary,
    valign: 'middle',
  });

  // Optional lightweight state indicator in the top-right corner (VISION §15).
  if (content.status !== undefined) {
    addStatusIndicator(slide, ctx, content.status, {
      x: placement.x + placement.width - METRIC_STATUS_SIZE,
      y: placement.y + (iconSize - METRIC_STATUS_SIZE) / 2,
      size: METRIC_STATUS_SIZE,
    });
  }

  // Catalog label under the value.
  const labelHeight = (T.scale.small / 72) * T.lineSpacing.loose;
  slide.addText(label, {
    x: placement.x + iconSize + S.sm,
    y: placement.y + iconSize + S.xs,
    w: placement.width - iconSize - S.sm,
    h: labelHeight,
    fontFace: T.fontFamily,
    fontSize: T.scale.small,
    color: C.textMuted,
    valign: 'top',
  });

  return iconSize + S.xs + labelHeight;
}
