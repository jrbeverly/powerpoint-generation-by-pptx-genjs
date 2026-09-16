import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type pptxgen from 'pptxgenjs';
import { describe, expect, it } from 'vitest';

import { addAdvisorySlide, addDeprecationSlide, addReleaseSlide } from '../src/archetypes/index.js';
import { resolveIcon } from '../src/catalog/icons.js';
import { createContextForProduct } from '../src/catalog/products.js';
import { NOTICE_CONSTRAINTS } from '../src/constraints/archetypes.js';
import { Typography } from '../src/theme/typography.js';
import { validatePresentation } from '../src/validation/validate-presentation.js';

const SAMPLE_PATH = fileURLToPath(new URL('../samples/notices-only.json', import.meta.url));

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

function loadNotices() {
  return validatePresentation(JSON.parse(readFileSync(SAMPLE_PATH, 'utf8')) as unknown)
    .presentation;
}

function images(calls: RecordedCall[]): string[] {
  return calls.filter((call) => call.kind === 'image').map((call) => call.data as string);
}

describe('notice archetypes', () => {
  it('renders every item in notices-only.json with stable category and product iconography', () => {
    const presentation = loadNotices();
    const ctx = createContextForProduct(presentation.product);
    const deck = makeRecordingDeck();

    for (const release of presentation.releases) addReleaseSlide(deck.pptx, ctx, release);
    for (const deprecation of presentation.deprecations)
      addDeprecationSlide(deck.pptx, ctx, deprecation);
    for (const advisory of presentation.advisories) addAdvisorySlide(deck.pptx, ctx, advisory);

    expect(deck.slideCount()).toBe(4);
    const renderedImages = images(deck.calls);
    expect(renderedImages.filter((data) => data === resolveIcon('release').data)).toHaveLength(2);
    expect(renderedImages.filter((data) => data === resolveIcon('deprecation').data)).toHaveLength(
      1,
    );
    expect(renderedImages.filter((data) => data === resolveIcon('advisory').data)).toHaveLength(1);
    expect(renderedImages.filter((data) => data === ctx.productTheme?.logo.data)).toHaveLength(4);
    expect(renderedImages).toContain(resolveIcon('healthy').data);
    expect(renderedImages).toContain(resolveIcon('upcoming').data);
    expect(renderedImages).toContain(resolveIcon('attention').data);
  });

  it('renders each notice-specific concise status line and its supporting bullets', () => {
    const presentation = loadNotices();
    const ctx = createContextForProduct(presentation.product);
    const deck = makeRecordingDeck();

    addReleaseSlide(deck.pptx, ctx, presentation.releases[0]!);
    addDeprecationSlide(deck.pptx, ctx, presentation.deprecations[0]!);
    addAdvisorySlide(deck.pptx, ctx, presentation.advisories[0]!);

    const statusLines = deck.calls
      .filter((call) => call.kind === 'text' && call.options?.fontSize === Typography.scale.h3)
      .map((call) => call.runs);
    expect(statusLines).toEqual([
      'Generally available',
      'Retirement: December 1',
      'Review required before November 1',
    ]);
    expect(
      deck.calls.filter((call) => call.kind === 'text' && String(call.runs).startsWith('• ')),
    ).toHaveLength(6);
  });

  it('fails before drawing when direct callers exceed notice constraints', () => {
    const ctx = createContextForProduct('atlas');
    const tooManyBullets = Array.from(
      { length: NOTICE_CONSTRAINTS.bullets.max + 1 },
      (_, index) => `Bullet ${index}`,
    );
    const deck = makeRecordingDeck();

    expect(() =>
      addAdvisorySlide(deck.pptx, ctx, { title: 'Overloaded advisory', bullets: tooManyBullets }),
    ).toThrow('advisory slides support at most 3 bullets');
    expect(deck.slideCount()).toBe(0);
    expect(deck.calls).toHaveLength(0);
  });
});
