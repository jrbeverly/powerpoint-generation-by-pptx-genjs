import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pptxgen from 'pptxgenjs';
import { describe, expect, it } from 'vitest';

import {
  addMetricDetailSlide,
  addMetricSelectedSlide,
  addMetricsOverviewSlide,
} from '../src/archetypes/index.js';
import { getMetricDefinition } from '../src/catalog/metrics.js';
import { createContextForProduct } from '../src/catalog/products.js';
import { METRIC_DETAIL_CONSTRAINTS } from '../src/constraints/archetypes.js';
import type { MetricEntry } from '../src/schema/metrics.js';
import { validatePresentation } from '../src/validation/validate-presentation.js';

const SAMPLE_PATH = fileURLToPath(new URL('../samples/metrics-only.json', import.meta.url));

interface RecordedCall {
  kind: 'image' | 'shape' | 'text';
  data?: string;
  runs?: unknown;
  options: Record<string, unknown>;
}

function makeRecordingDeck(): { pptx: pptxgen; calls: RecordedCall[]; slideCount: () => number } {
  const calls: RecordedCall[] = [];
  let slideCount = 0;
  const pptx = {
    ShapeType: { rect: 'rect', line: 'line' },
    addSlide() {
      slideCount += 1;
      return {
        background: {},
        addImage(options: { data: string } & Record<string, unknown>) {
          calls.push({ kind: 'image', data: options.data, options });
          return this;
        },
        addShape(_shapeName: string, options: Record<string, unknown>) {
          calls.push({ kind: 'shape', options });
          return this;
        },
        addText(runs: unknown, options: Record<string, unknown>) {
          calls.push({ kind: 'text', runs, options });
          return this;
        },
      };
    },
  } as unknown as pptxgen;
  return { pptx, calls, slideCount: () => slideCount };
}

function loadMetrics(): readonly MetricEntry[] {
  return validatePresentation(JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as unknown).presentation
    .metrics;
}

function metricIconPositions(calls: readonly RecordedCall[], metrics: readonly MetricEntry[]) {
  return metrics.map((metric) => {
    const data = getMetricDefinition(metric.metric).icon.data;
    const call = calls.find((candidate) => candidate.kind === 'image' && candidate.data === data);
    return { metric: metric.metric, x: call?.options.x, y: call?.options.y };
  });
}

describe('metric archetype sequence', () => {
  it('renders the sample overview with catalog identities in a context column and metric grid', () => {
    const metrics = loadMetrics();
    const deck = makeRecordingDeck();

    addMetricsOverviewSlide(deck.pptx, createContextForProduct('nimbus'), metrics);

    expect(deck.slideCount()).toBe(1);
    for (const metric of metrics) {
      expect(deck.calls.map((call) => call.data)).toContain(
        getMetricDefinition(metric.metric).icon.data,
      );
      expect(deck.calls.map((call) => call.runs)).toContain(
        getMetricDefinition(metric.metric).shortLabel,
      );
    }
    expect(deck.calls.map((call) => call.runs)).toContain(
      'A quick view of current delivery and operational health.',
    );
  });

  it('reuses overview geometry while emphasizing exactly one selected metric', () => {
    const metrics = loadMetrics();
    const ctx = createContextForProduct('nimbus');
    const overview = makeRecordingDeck();
    const selected = makeRecordingDeck();

    addMetricsOverviewSlide(overview.pptx, ctx, metrics);
    addMetricSelectedSlide(selected.pptx, ctx, {
      metrics,
      selectedMetric: 'throughput',
    });

    expect(metricIconPositions(selected.calls, metrics)).toEqual(
      metricIconPositions(overview.calls, metrics),
    );
    expect(selected.calls.filter((call) => call.runs === 'SELECTED')).toHaveLength(1);
    expect(
      selected.calls.filter(
        (call) =>
          call.kind === 'shape' &&
          (call.options.fill as { color?: string; transparency?: number } | undefined)?.color ===
            ctx.productTheme?.accent &&
          (call.options.fill as { transparency?: number } | undefined)?.transparency === 0,
      ),
    ).toHaveLength(1);
  });

  it('renders one metric detail with the same catalog icon, full label, and supporting content', () => {
    const metric = loadMetrics()[1]!;
    const deck = makeRecordingDeck();

    addMetricDetailSlide(deck.pptx, createContextForProduct('nimbus'), [metric]);

    const definition = getMetricDefinition(metric.metric);
    expect(deck.slideCount()).toBe(1);
    expect(deck.calls.map((call) => call.data)).toContain(definition.icon.data);
    expect(deck.calls.map((call) => call.runs)).toContainEqual([
      { text: definition.label.toUpperCase(), options: { bold: true } },
    ]);
    expect(deck.calls.map((call) => call.runs)).toContain(definition.description);
    for (const bullet of metric.bullets ?? []) {
      expect(deck.calls.map((call) => call.runs)).toContain(`• ${bullet}`);
    }
  });

  it('fails before drawing unless detail receives exactly one metric', () => {
    const metrics = loadMetrics();
    for (const invalid of [[], metrics.slice(0, 2)]) {
      const deck = makeRecordingDeck();
      expect(() =>
        addMetricDetailSlide(deck.pptx, createContextForProduct('nimbus'), invalid),
      ).toThrow('requires exactly one metric');
      expect(deck.slideCount()).toBe(0);
    }
  });

  it('fails before drawing when detail receives more than three bullets', () => {
    const metric = loadMetrics()[0]!;
    const deck = makeRecordingDeck();
    const overLimit = {
      ...metric,
      bullets: Array.from(
        { length: METRIC_DETAIL_CONSTRAINTS.bullets.max + 1 },
        (_, index) => `Bullet ${index}`,
      ),
    };

    expect(() =>
      addMetricDetailSlide(deck.pptx, createContextForProduct('nimbus'), [overLimit]),
    ).toThrow('at most 3 supporting bullets');
    expect(deck.slideCount()).toBe(0);
  });

  it('fails before drawing when the selected metric is absent from the overview', () => {
    const deck = makeRecordingDeck();
    expect(() =>
      addMetricSelectedSlide(deck.pptx, createContextForProduct('nimbus'), {
        metrics: loadMetrics(),
        selectedMetric: 'adoption',
      }),
    ).toThrow('requires exactly one overview entry');
    expect(deck.slideCount()).toBe(0);
  });

  it('writes the complete three-slide sequence from sample metric data', async () => {
    const metrics = loadMetrics();
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    const ctx = createContextForProduct('nimbus');
    addMetricsOverviewSlide(pptx, ctx, metrics);
    addMetricSelectedSlide(pptx, ctx, { metrics, selectedMetric: metrics[0]!.metric });
    addMetricDetailSlide(pptx, ctx, [metrics[0]!]);

    const workDir = await mkdtemp(join(tmpdir(), 'pptx-metrics-'));
    const outputPath = join(workDir, 'metrics-sequence.pptx');
    try {
      await pptx.writeFile({ fileName: outputPath });
      const bytes = await readFile(outputPath);
      const listing = bytes.toString('latin1');
      expect(bytes.length).toBeGreaterThan(1024);
      expect(listing).toContain('ppt/slides/slide3.xml');
      expect(listing).not.toContain('ppt/slides/slide4.xml');
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  });
});
