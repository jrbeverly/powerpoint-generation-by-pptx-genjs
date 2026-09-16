import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type pptxgen from 'pptxgenjs';
import { describe, expect, it } from 'vitest';

import { addThemesSlide, addTitleSlide } from '../src/archetypes/index.js';
import { resolveIcon } from '../src/catalog/icons.js';
import { createContextForProduct } from '../src/catalog/products.js';
import { THEMES_CONSTRAINTS } from '../src/constraints/archetypes.js';
import {
  PresentationValidationError,
  validatePresentation,
} from '../src/validation/validate-presentation.js';

const SAMPLE_PATH = fileURLToPath(new URL('../samples/full-sprint.json', import.meta.url));

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

function loadSample() {
  return validatePresentation(JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as unknown)
    .presentation;
}

describe('addTitleSlide', () => {
  it('renders the sample overview with product identity supplied by RenderContext', () => {
    const presentation = loadSample();
    const ctx = createContextForProduct(presentation.product);
    const deck = makeRecordingDeck();

    addTitleSlide(deck.pptx, ctx, presentation);

    expect(deck.slideCount()).toBe(1);
    expect(deck.calls.filter((call) => call.kind === 'image').map((call) => call.data)).toEqual([
      ctx.productTheme?.icon.data,
    ]);
    const texts = deck.calls.filter((call) => call.kind === 'text').map((call) => call.runs);
    expect(texts).toEqual([presentation.title, presentation.subtitle, presentation.dateRange]);
  });
});

describe('addThemesSlide', () => {
  it('renders every sample theme with a large icon, heading, and short bullets', () => {
    const presentation = loadSample();
    const ctx = createContextForProduct(presentation.product);
    const deck = makeRecordingDeck();

    addThemesSlide(deck.pptx, ctx, presentation.themes);

    expect(deck.slideCount()).toBe(1);
    const images = deck.calls.filter((call) => call.kind === 'image');
    for (const theme of presentation.themes) {
      expect(images.map((call) => call.data)).toContain(resolveIcon(theme.icon).data);
      expect(deck.calls.map((call) => call.runs)).toContain(theme.title);
      for (const bullet of theme.bullets) {
        expect(deck.calls.map((call) => call.runs)).toContain(`• ${bullet}`);
      }
    }
  });

  it('fails before drawing when a direct caller exceeds the theme constraints', () => {
    const presentation = loadSample();
    const deck = makeRecordingDeck();
    const themes = [...presentation.themes, { icon: 'sprint', title: 'Extra', bullets: [] }];

    expect(() => addThemesSlide(deck.pptx, createContextForProduct('atlas'), themes)).toThrow(
      `supports ${THEMES_CONSTRAINTS.count.min}–${THEMES_CONSTRAINTS.count.max} themes`,
    );
    expect(deck.slideCount()).toBe(0);
    expect(deck.calls).toHaveLength(0);
  });

  it('rejects over-limit theme content through the presentation validation layer', () => {
    const input = JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as {
      presentation: { themes: Array<{ bullets: string[] }> };
    };
    input.presentation.themes[0]!.bullets = Array.from(
      { length: THEMES_CONSTRAINTS.bulletsPerTheme.max + 1 },
      (_, index) => `Bullet ${index}`,
    );

    expect(() => validatePresentation(input)).toThrow(PresentationValidationError);
  });
});
