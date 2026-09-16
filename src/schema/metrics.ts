import { z } from 'zod';

import { bulletSchema, statusSchema, trendSchema } from './common.js';

/**
 * Ids of the known metric catalog (VISION §14).
 *
 * Metrics come from a known catalog: the JSON selects a metric by id and
 * supplies its value. It cannot supply icons, labels, or formatting — the
 * catalog definition (label, icon, formatting) is resolved by the renderer
 * from `catalog/metrics`.
 */
export const METRIC_IDS = [
  'delivery-confidence',
  'throughput',
  'quality',
  'reliability',
  'adoption',
  'velocity',
  'operational-health',
  'customer-impact',
] as const;

export const metricIdSchema = z.enum(METRIC_IDS);
export type MetricId = z.infer<typeof metricIdSchema>;

/**
 * A metric selected for the presentation (VISION §14, §37).
 *
 * - `value` is the numeric measurement; units, precision, and formatting are
 *   owned by the metric catalog / renderer.
 * - `trend` compares against the prior sprint and may be omitted.
 * - `status` drives the state indicator.
 * - `detail` and `bullets` support the metric detail slide (VISION §17).
 */
export const metricEntrySchema = z.strictObject({
  metric: metricIdSchema,
  value: z.number(),
  trend: trendSchema.optional(),
  status: statusSchema,
  detail: z.string().min(1).optional(),
  bullets: z.array(bulletSchema).optional(),
});
export type MetricEntry = z.infer<typeof metricEntrySchema>;
