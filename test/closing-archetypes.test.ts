import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type pptxgen from 'pptxgenjs';
import { describe, expect, it } from 'vitest';

import { addRoadmapSlide, addSprintSummarySlide } from '../src/archetypes/index.js';
import { resolveIcon } from '../src/catalog/icons.js';
import { createContextForProduct } from '../src/catalog/products.js';
import { ROADMAP_CONSTRAINTS, SPRINT_SUMMARY_CONSTRAINTS } from '../src/constraints/archetypes.js';
import { validatePresentation } from '../src/validation/validate-presentation.js';

const ROADMAP_SAMPLE = fileURLToPath(new URL('../samples/roadmap-only.json', import.meta.url));

interface RecordedCall {
  kind: 'image' | 'shape' | 'text';
  data?: string;
  runs?: unknown;
  options?: Record<string, unknown>;
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
        addImage(options: { data: string }) {
          calls.push({ kind: 'image', data: options.data });
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

describe('addRoadmapSlide', () => {
  it('renders the sample data as a minimal NOW / NEXT / LATER structure', () => {
    const presentation = validatePresentation(
      JSON.parse(readFileSync(ROADMAP_SAMPLE, 'utf8')) as unknown,
    ).presentation;
    const deck = makeRecordingDeck();
    addRoadmapSlide(deck.pptx, createContextForProduct(presentation.product), presentation.roadmap);

    expect(deck.slideCount()).toBe(1);
    const texts = deck.calls.filter((call) => call.kind === 'text').map((call) => call.runs);
    expect(texts).toContainEqual([{ text: 'COMING NEXT', options: { bold: true } }]);
    expect(texts.filter((text) => ['NOW', 'NEXT', 'LATER'].includes(String(text)))).toEqual([
      'NOW',
      'NEXT',
      'LATER',
    ]);
    for (const item of presentation.roadmap) expect(texts).toContain(item.title);
    expect(deck.calls.filter((call) => call.kind === 'shape')).toHaveLength(2);
  });

  it('fails before drawing when roadmap constraints are exceeded', () => {
    const deck = makeRecordingDeck();
    const items = Array.from({ length: ROADMAP_CONSTRAINTS.items.max + 1 }, (_, index) => ({
      horizon: 'now' as const,
      title: `Item ${index}`,
    }));
    expect(() => addRoadmapSlide(deck.pptx, createContextForProduct('atlas'), items)).toThrow(
      'at most 6 items',
    );
    expect(deck.slideCount()).toBe(0);
  });
});

describe('addSprintSummarySlide', () => {
  it('reuses semantic icons from earlier slides for each summary statement', () => {
    const deck = makeRecordingDeck();
    addSprintSummarySlide(deck.pptx, createContextForProduct('atlas'), {
      sprint: 'SPRINT 42',
      keyAccomplishment: { icon: 'project', text: 'Pilot expanded' },
      overallState: { status: 'healthy', text: 'Adoption improving' },
      majorUpcomingItem: { icon: 'roadmap', text: 'Production rollout begins next sprint' },
    });

    expect(deck.slideCount()).toBe(1);
    const images = deck.calls
      .filter((call) => call.kind === 'image')
      .map((call) => call.data as string);
    expect(images).toContain(resolveIcon('summary').data);
    expect(images).toContain(resolveIcon('project').data);
    expect(images).toContain(resolveIcon('healthy').data);
    expect(images).toContain(resolveIcon('roadmap').data);
    expect(images).toContain(createContextForProduct('atlas').productTheme?.logo.data);
  });

  it('fails before drawing when a statement exceeds its content constraint', () => {
    const deck = makeRecordingDeck();
    expect(() =>
      addSprintSummarySlide(deck.pptx, createContextForProduct('atlas'), {
        sprint: 'SPRINT 42',
        keyAccomplishment: {
          icon: 'complete',
          text: 'A'.repeat(SPRINT_SUMMARY_CONSTRAINTS.itemTextLength.max + 1),
        },
        overallState: { status: 'healthy', text: 'Healthy' },
        majorUpcomingItem: { icon: 'roadmap', text: 'Production rollout' },
      }),
    ).toThrow('statements up to 100 characters');
    expect(deck.slideCount()).toBe(0);
  });
});
