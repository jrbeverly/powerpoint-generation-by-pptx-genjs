import { formatMetricValue, getMetricDefinition } from '../catalog/metrics.js';
import { addApplicationHeader, addBulletGroup } from '../components/index.js';
import { METRIC_DETAIL_CONSTRAINTS } from '../constraints/archetypes.js';
import type { MetricEntry } from '../schema/metrics.js';

import type { ArchetypeRenderer } from './types.js';

/**
 * Renders one catalog metric with a large value, state/trend, explanation,
 * and no more than three supporting bullets (VISION §17).
 */
export const addMetricDetailSlide: ArchetypeRenderer<readonly MetricEntry[]> = (
  pptx,
  ctx,
  metrics,
): void => {
  if (metrics.length !== 1) {
    throw new Error(
      `Metric Detail requires exactly one metric, got ${metrics.length} (VISION §17).`,
    );
  }
  const metric = metrics[0]!;
  const bullets = metric.bullets ?? [];
  if (bullets.length > METRIC_DETAIL_CONSTRAINTS.bullets.max) {
    throw new Error(
      `Metric Detail supports at most ${METRIC_DETAIL_CONSTRAINTS.bullets.max} supporting bullets, ` +
        `got ${bullets.length} for "${metric.metric}" (VISION §17, §30).`,
    );
  }

  const definition = getMetricDefinition(metric.metric);
  const { layout: L, typography: T, spacing: S, colors: C, productTheme } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: C.backgroundDark };
  addApplicationHeader(pptx, slide, ctx, {
    icon: definition.id,
    title: definition.label.toUpperCase(),
    status: metric.status,
  });

  const width = L.content.right - L.content.left;
  const valueY = L.content.top + S.xl;
  const valueHeight = (T.scale.display / 72) * T.lineSpacing.loose;
  slide.addText(formatMetricValue(definition, metric.value), {
    x: L.content.left,
    y: valueY,
    w: width,
    h: valueHeight,
    fontFace: T.fontFamily,
    fontSize: T.scale.display,
    bold: true,
    color: C.textPrimary,
    align: 'center',
    valign: 'middle',
  });

  let y = valueY + valueHeight + S.md;
  if (metric.trend !== undefined) {
    const trendColor =
      metric.trend === 'up' ? C.healthy : metric.trend === 'down' ? C.blocked : C.textMuted;
    slide.addText(`${definition.formatting.trendArrows[metric.trend]} from prior sprint`, {
      x: L.content.left,
      y,
      w: width,
      h: (T.scale.h3 / 72) * T.lineSpacing.loose,
      fontFace: T.fontFamily,
      fontSize: T.scale.h3,
      bold: true,
      color: trendColor,
      align: 'center',
    });
    y += S.xl;
  }

  slide.addText(metric.detail ?? definition.description, {
    x: L.content.left + S.xxl,
    y,
    w: width - S.xxl * 2,
    h: S.xxl,
    fontFace: T.fontFamily,
    fontSize: T.scale.body,
    color: C.textSecondary,
    align: 'center',
    valign: 'middle',
  });
  y += S.xxl + S.lg;

  addBulletGroup(slide, ctx, bullets, {
    x: L.content.left + width / 4,
    y,
    width: width / 2,
  });

  if (productTheme !== undefined) {
    slide.addShape(pptx.ShapeType.line, {
      x: L.content.left + width / 4,
      y: y - S.md,
      w: width / 2,
      h: 0,
      line: { color: productTheme.accent, width: 1.5 },
    });
  }
};
