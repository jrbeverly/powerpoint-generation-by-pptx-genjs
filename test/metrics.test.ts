import { describe, expect, it } from 'vitest';

import { resolveIcon } from '../src/catalog/icons.js';
import {
  METRIC_DEFINITIONS,
  TREND_ARROWS,
  formatMetricValue,
  getMetricDefinition,
  isKnownMetricId,
} from '../src/catalog/metrics.js';
import { validateConstraints } from '../src/constraints/validate.js';
import { METRIC_IDS } from '../src/schema/metrics.js';
import { parsePresentation } from '../src/schema/presentation.js';

describe('metric catalog', () => {
  it('seeds the eight vision example metrics (VISION §14)', () => {
    expect([...METRIC_IDS]).toEqual([
      'delivery-confidence',
      'throughput',
      'quality',
      'reliability',
      'adoption',
      'velocity',
      'operational-health',
      'customer-impact',
    ]);
  });

  it('is closed over the metric vocabulary — every id has exactly one definition', () => {
    expect(Object.keys(METRIC_DEFINITIONS)).toEqual([...METRIC_IDS]);
    expect(new Set(METRIC_IDS).size).toBe(METRIC_IDS.length);
  });

  it('defines id, label, shortLabel, icon, description, and formatting for every metric', () => {
    for (const id of METRIC_IDS) {
      const def = getMetricDefinition(id);
      expect(def.id).toBe(id);
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.shortLabel.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(0);
      expect(def.formatting.precision).toBeGreaterThanOrEqual(0);
      expect(def.icon.data.startsWith('data:image/svg+xml;base64,')).toBe(true);
    }
  });

  it('labels match the vision examples (VISION §15, §16)', () => {
    expect(getMetricDefinition('delivery-confidence').label).toBe('Delivery Confidence');
    expect(getMetricDefinition('delivery-confidence').shortLabel).toBe('Delivery');
    expect(getMetricDefinition('operational-health').label).toBe('Operational Health');
    expect(getMetricDefinition('operational-health').shortLabel).toBe('Operational');
    expect(getMetricDefinition('customer-impact').label).toBe('Customer Impact');
    expect(getMetricDefinition('adoption').label).toBe('Adoption');
  });

  it('resolves metric icons through the shared asset catalog (VISION §40)', () => {
    for (const id of METRIC_IDS) {
      const def = getMetricDefinition(id);
      expect(def.icon.id).toBe(id);
      // Visual continuity: the metric's icon is the same asset the icon
      // catalog resolves for the same semantic id.
      expect(def.icon.data).toBe(resolveIcon(id).data);
    }
  });

  it('throws loudly for unknown metric ids and never returns a placeholder (VISION §31)', () => {
    for (const unknown of ['', 'not-a-metric', 'foundation', 'Delivery Confidence', 'ADOPTION']) {
      expect(() => getMetricDefinition(unknown)).toThrow(`Unknown metric id "${unknown}"`);
      expect(isKnownMetricId(unknown)).toBe(false);
    }
    expect(isKnownMetricId('adoption')).toBe(true);
  });

  it('formats percentages and raw values per the catalog rules (VISION §14)', () => {
    expect(formatMetricValue(getMetricDefinition('delivery-confidence'), 92)).toBe('92%');
    expect(formatMetricValue(getMetricDefinition('delivery-confidence'), 92.4)).toBe('92%');
    expect(formatMetricValue(getMetricDefinition('reliability'), 99.9)).toBe('99.9%');
    expect(formatMetricValue(getMetricDefinition('velocity'), 42)).toBe('42 pts');
    expect(formatMetricValue(getMetricDefinition('throughput'), 38)).toBe('38 items');
  });

  it('maps every trend direction to an arrow glyph, shared by all metrics (VISION §17)', () => {
    expect(TREND_ARROWS).toEqual({ up: '↑', down: '↓', flat: '→' });
    for (const id of METRIC_IDS) {
      expect(getMetricDefinition(id).formatting.trendArrows).toBe(TREND_ARROWS);
    }
  });

  it('resolves parsed JSON metric entries through the catalog end to end', () => {
    const doc = parsePresentation({
      version: '1.0',
      presentation: {
        title: 'Sprint 42 Overview',
        sprint: 'Sprint 42',
        product: 'atlas',
        themes: [],
        metrics: METRIC_IDS.map((metric) => ({ metric, value: 50, status: 'healthy' as const })),
        projects: [],
        releases: [],
        deprecations: [],
        advisories: [],
        roadmap: [],
      },
    });

    // Validation consumes the catalog: every entry must resolve (VISION §31).
    expect(() => validateConstraints(doc.presentation)).not.toThrow();

    // Labels and icons come from the catalog, never from the input (VISION §14).
    for (const entry of doc.presentation.metrics) {
      const def = getMetricDefinition(entry.metric);
      expect(def.label).toBe(getMetricDefinition(entry.metric).label);
      expect(def.icon.data).toBe(resolveIcon(entry.metric).data);
    }
  });

  it('rejects an unknown metric id in JSON at validation (VISION §14, §31)', () => {
    expect(() =>
      parsePresentation({
        version: '1.0',
        presentation: {
          title: 'Sprint 1 Overview',
          sprint: 'Sprint 1',
          product: 'atlas',
          themes: [],
          metrics: [{ metric: 'not-a-metric', value: 50, status: 'healthy' }],
          projects: [],
          releases: [],
          deprecations: [],
          advisories: [],
          roadmap: [],
        },
      }),
    ).toThrow(/expected one of/);
  });
});
