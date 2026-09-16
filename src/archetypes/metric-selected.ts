import type { MetricEntry, MetricId } from '../schema/metrics.js';

import { addMetricsLandscapeSlide } from './metrics-overview.js';
import type { ArchetypeRenderer } from './types.js';

export interface MetricSelection {
  metrics: readonly MetricEntry[];
  selectedMetric: MetricId;
}

/** Reuses the overview geometry and changes only visual emphasis (VISION §16). */
export const addMetricSelectedSlide: ArchetypeRenderer<MetricSelection> = (
  pptx,
  ctx,
  selection,
): void => {
  addMetricsLandscapeSlide(pptx, ctx, selection.metrics, {
    selectedMetric: selection.selectedMetric,
  });
};
