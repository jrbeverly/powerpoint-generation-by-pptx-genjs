import type pptxgen from 'pptxgenjs';

import { addApplicationHeader, addMetric, addProgressBar } from '../components/index.js';
import type { MetricEntry, MetricId } from '../schema/metrics.js';
import type { RenderContext } from '../theme/context.js';

import type { ArchetypeRenderer } from './types.js';

const MAX_OVERVIEW_METRICS = 4;

/** Options used by Metric Selected to re-render this exact landscape. */
interface MetricsLandscapeOptions {
  selectedMetric?: MetricId;
}

/**
 * Shared metrics landscape for the overview and progressive-selection slides.
 * Keeping the geometry in one renderer makes selection read as emphasis rather
 * than as a layout transition (VISION §15, §16, §40).
 */
export function addMetricsLandscapeSlide(
  pptx: pptxgen,
  ctx: RenderContext,
  metrics: readonly MetricEntry[],
  options: MetricsLandscapeOptions = {},
): void {
  if (metrics.length === 0 || metrics.length > MAX_OVERVIEW_METRICS) {
    throw new Error(
      `Metrics landscape supports 1–${MAX_OVERVIEW_METRICS} metrics, got ${metrics.length}. ` +
        'Overflow is an input validation problem, not a typography problem (VISION §30).',
    );
  }

  const selected = options.selectedMetric;
  if (selected !== undefined && metrics.filter((entry) => entry.metric === selected).length !== 1) {
    throw new Error(
      `Metric Selected requires exactly one overview entry for "${selected}" (VISION §16).`,
    );
  }

  const { layout: L, typography: T, spacing: S, colors: C, productTheme } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: C.backgroundDark };
  addApplicationHeader(pptx, slide, ctx, { icon: 'summary', title: 'SPRINT HEALTH' });

  const contentWidth = L.content.right - L.content.left;
  const contextWidth = contentWidth / 4;
  const dividerX = L.content.left + contextWidth;
  const gridLeft = dividerX + S.xl;
  const gridWidth = L.content.right - gridLeft;
  const columnGap = S.xl;
  const cardWidth = (gridWidth - columnGap) / 2;
  const gridTop = L.content.top + S.xl;
  const rowHeight = (L.content.bottom - gridTop) / 2;
  const accent = productTheme?.accent ?? C.accent;

  slide.addText('SPRINT HEALTH', {
    x: L.content.left,
    y: gridTop,
    w: contextWidth - S.lg,
    h: (T.scale.h2 / 72) * T.lineSpacing.loose,
    fontFace: T.fontFamily,
    fontSize: T.scale.h2,
    bold: true,
    color: C.textPrimary,
  });
  slide.addText('A quick view of current delivery and operational health.', {
    x: L.content.left,
    y: gridTop + S.xxl,
    w: contextWidth - S.lg,
    h: S.xxl * 2,
    fontFace: T.fontFamily,
    fontSize: T.scale.body,
    color: C.textSecondary,
    breakLine: false,
    valign: 'top',
  });
  slide.addShape(pptx.ShapeType.line, {
    x: dividerX,
    y: L.content.top + S.md,
    w: 0,
    h: L.content.bottom - L.content.top - S.md,
    line: { color: C.backgroundMid, width: 1.5 },
  });

  metrics.forEach((metric, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = gridLeft + column * (cardWidth + columnGap);
    const y = gridTop + row * rowHeight;

    addMetric(slide, ctx, metric, { x, y, width: cardWidth });

    if (selected !== undefined) {
      const isSelected = metric.metric === selected;
      if (!isSelected) {
        slide.addShape(pptx.ShapeType.rect, {
          x: x - S.sm,
          y: y - S.sm,
          w: cardWidth + S.md,
          h: rowHeight - S.md,
          fill: { color: C.backgroundDark, transparency: 28 },
          line: { type: 'none' },
        });
      }
      addProgressBar(
        pptx,
        slide,
        ctx,
        { x, y: y + S.xxl, width: cardWidth },
        { value: metric.value, emphasis: isSelected ? 'selected' : 'muted' },
      );
      if (isSelected) {
        slide.addText('SELECTED', {
          x,
          y: y + S.xxl + S.sm,
          w: cardWidth,
          h: (T.scale.label / 72) * T.lineSpacing.loose,
          fontFace: T.fontFamily,
          fontSize: T.scale.label,
          bold: true,
          color: accent,
        });
      }
    }
  });
}

/** Establishes the metric landscape before individual metrics are discussed. */
export const addMetricsOverviewSlide: ArchetypeRenderer<readonly MetricEntry[]> = (
  pptx,
  ctx,
  metrics,
): void => addMetricsLandscapeSlide(pptx, ctx, metrics);
