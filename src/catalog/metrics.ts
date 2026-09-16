import type { Trend } from '../schema/common.js';
import { METRIC_IDS, type MetricId } from '../schema/metrics.js';
import { resolveIcon, type ResolvedIcon } from './icons.js';

/**
 * The metric catalog: the single source of truth for metric identity, labels,
 * icons, and value formatting (VISION §14).
 *
 * The presentation JSON selects a metric by id and supplies its value — it
 * never supplies labels, icons, or formatting. Components resolve a
 * `MetricEntry` through {@link getMetricDefinition} to obtain everything the
 * renderer needs, so the same metric always carries the same label, icon,
 * and format wherever it appears (visual continuity, VISION §40).
 *
 * Icons are resolved through the shared icon catalog at definition time, so
 * a metric icon is the same asset the icon catalog resolves for the same
 * semantic id (VISION §39). Unknown ids fail loudly instead of silently
 * rendering a placeholder (VISION §31).
 */

/**
 * Arrow glyph per trend direction, for "↑ 12% from prior sprint" on the
 * metric detail slide (VISION §17).
 */
export const TREND_ARROWS: Readonly<Record<Trend, string>> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

/**
 * How a metric value is rendered from its raw number (VISION §14).
 *
 * The JSON supplies the bare numeric value; units, precision, and trend
 * glyphs all come from the catalog, never from the input.
 */
export interface MetricFormatting {
  /** Value kind: `"percentage"` renders a trailing "%" (92 → "92%"); `"raw"` renders the bare number. */
  kind: 'percentage' | 'raw';
  /** Decimal places to render; 0 rounds to a whole number. */
  precision: number;
  /** Unit suffix for raw values (e.g. " items" for throughput); ignored for percentages. */
  suffix?: string;
  /** Arrow glyph per trend direction, shared by every metric today. */
  trendArrows: Readonly<Record<Trend, string>>;
}

/**
 * Predefined metadata for one known metric (VISION §14).
 */
export interface MetricDefinition {
  /** Stable catalog id; the JSON references exactly this value. */
  id: MetricId;
  /** Full display label, e.g. the metric detail slide header (VISION §17). */
  label: string;
  /** Compact label for tight layouts, e.g. the metrics overview grid (VISION §15). */
  shortLabel: string;
  /** Render-ready icon resolved through the shared asset catalog (VISION §40). */
  icon: ResolvedIcon;
  /** One-sentence description of what the metric measures (VISION §17). */
  description: string;
  /** Value rendering and trend rules. */
  formatting: MetricFormatting;
}

/**
 * The known metric catalog, keyed by metric id (VISION §14).
 *
 * The keys are exactly the schema's `METRIC_IDS`; the `Record` type makes the
 * catalog exhaustive and closed, so the schema and the catalog cannot drift
 * apart.
 */
export const METRIC_DEFINITIONS: Readonly<Record<MetricId, MetricDefinition>> = {
  'delivery-confidence': {
    id: 'delivery-confidence',
    label: 'Delivery Confidence',
    shortLabel: 'Delivery',
    icon: resolveIcon('delivery-confidence'),
    description: 'Confidence that sprint commitments will land as planned.',
    formatting: { kind: 'percentage', precision: 0, trendArrows: TREND_ARROWS },
  },
  throughput: {
    id: 'throughput',
    label: 'Throughput',
    shortLabel: 'Throughput',
    icon: resolveIcon('throughput'),
    description: 'Work items delivered during the sprint.',
    formatting: { kind: 'raw', precision: 0, suffix: ' items', trendArrows: TREND_ARROWS },
  },
  quality: {
    id: 'quality',
    label: 'Quality',
    shortLabel: 'Quality',
    icon: resolveIcon('quality'),
    description: 'Share of delivered work that meets the quality bar.',
    formatting: { kind: 'percentage', precision: 0, trendArrows: TREND_ARROWS },
  },
  reliability: {
    id: 'reliability',
    label: 'Reliability',
    shortLabel: 'Reliability',
    icon: resolveIcon('reliability'),
    description: 'Availability and stability of the delivered experience.',
    // Reliability is conventionally reported with one decimal (e.g. 99.9%).
    formatting: { kind: 'percentage', precision: 1, trendArrows: TREND_ARROWS },
  },
  adoption: {
    id: 'adoption',
    label: 'Adoption',
    shortLabel: 'Adoption',
    icon: resolveIcon('adoption'),
    description: 'Share of the target population actively using the product.',
    formatting: { kind: 'percentage', precision: 0, trendArrows: TREND_ARROWS },
  },
  velocity: {
    id: 'velocity',
    label: 'Velocity',
    shortLabel: 'Velocity',
    icon: resolveIcon('velocity'),
    description: 'Delivery pace over recent sprints, in story points.',
    formatting: { kind: 'raw', precision: 0, suffix: ' pts', trendArrows: TREND_ARROWS },
  },
  'operational-health': {
    id: 'operational-health',
    label: 'Operational Health',
    shortLabel: 'Operational',
    icon: resolveIcon('operational-health'),
    description: 'Overall health of production operations.',
    formatting: { kind: 'percentage', precision: 0, trendArrows: TREND_ARROWS },
  },
  'customer-impact': {
    id: 'customer-impact',
    label: 'Customer Impact',
    shortLabel: 'Impact',
    icon: resolveIcon('customer-impact'),
    description: 'Share of customers experiencing a meaningful positive impact.',
    formatting: { kind: 'percentage', precision: 0, trendArrows: TREND_ARROWS },
  },
};

const KNOWN_METRIC_IDS: ReadonlySet<string> = new Set<string>(METRIC_IDS);

/**
 * Whether `id` is a metric the catalog can resolve. Validation layers use
 * this to surface unknown metric ids as validation failures (VISION §31).
 */
export function isKnownMetricId(id: string): id is MetricId {
  return KNOWN_METRIC_IDS.has(id);
}

/**
 * Resolves a metric id to its catalog definition.
 *
 * Fails loudly for unknown ids — never returns a placeholder definition
 * (VISION §31). Resolution is a pure lookup, so the same id always yields
 * the same labels, icon, and formatting everywhere (VISION §40).
 */
export function getMetricDefinition(id: string): MetricDefinition {
  if (!isKnownMetricId(id)) {
    throw new Error(
      `Unknown metric id "${id}". Expected one of the catalog ids: ${METRIC_IDS.join(', ')}.`,
    );
  }
  return METRIC_DEFINITIONS[id];
}

/**
 * Renders a metric value using its catalog formatting rules (VISION §14):
 * percentages gain a trailing "%" (with the catalog precision), raw values
 * gain their catalog suffix (e.g. "42 pts").
 */
export function formatMetricValue(definition: MetricDefinition, value: number): string {
  const { formatting } = definition;
  const digits = value.toFixed(formatting.precision);
  const unit = formatting.kind === 'percentage' ? '%' : (formatting.suffix ?? '');
  return `${digits}${unit}`;
}
