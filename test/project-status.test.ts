import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type pptxgen from 'pptxgenjs';
import { describe, expect, it } from 'vitest';

import { addProjectStatusSlide } from '../src/archetypes/index.js';
import { resolveIcon } from '../src/catalog/icons.js';
import { createContextForProduct } from '../src/catalog/products.js';
import { PROJECT_STATUS_CONSTRAINTS } from '../src/constraints/archetypes.js';
import type { ProjectStatus } from '../src/schema/common.js';
import type { Project } from '../src/schema/projects.js';
import { Colors } from '../src/theme/colors.js';
import { createDefaultContext } from '../src/theme/context.js';
import { Layout } from '../src/theme/layout.js';
import { Spacing } from '../src/theme/spacing.js';
import { Typography } from '../src/theme/typography.js';
import { validatePresentation } from '../src/validation/validate-presentation.js';

const SAMPLES_DIR = fileURLToPath(new URL('../samples', import.meta.url));

function loadSample(name: string): unknown {
  return JSON.parse(readFileSync(join(SAMPLES_DIR, `${name}.json`), 'utf-8')) as unknown;
}

/** Loads and validates a sample fixture, returning its first project. */
function loadValidatedProject(name: string): Project {
  const doc = validatePresentation(loadSample(name));
  const project = doc.presentation.projects[0];
  expect(project).toBeDefined();
  return project as Project;
}

// ---------------------------------------------------------------------------
// Recording deck: captures every draw call for structure and geometry asserts
// ---------------------------------------------------------------------------

interface RecordedImage {
  kind: 'image';
  data: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RecordedShape {
  kind: 'shape';
  shapeName: string;
  options: Record<string, unknown>;
}

interface RecordedText {
  kind: 'text';
  runs: unknown;
  options: Record<string, unknown>;
}

type RecordedCall = RecordedImage | RecordedShape | RecordedText;

interface RecordingDeck {
  pptx: pptxgen;
  calls: RecordedCall[];
  slides: Array<{ background?: Record<string, unknown> }>;
  slideCount(): number;
}

/** A fake `pptxgen` that records draw calls instead of rendering. */
function makeRecordingDeck(): RecordingDeck {
  const calls: RecordedCall[] = [];
  const slides: Array<{ background?: Record<string, unknown> }> = [];
  let added = 0;

  const makeSlide = (): pptxgen.Slide => {
    const slide = {
      background: {},
      addImage(options: { data: string; x: number; y: number; w: number; h: number }) {
        calls.push({
          kind: 'image',
          data: options.data,
          x: options.x,
          y: options.y,
          w: options.w,
          h: options.h,
        });
        return this;
      },
      addShape(shapeName: string, options: Record<string, unknown>) {
        calls.push({ kind: 'shape', shapeName, options });
        return this;
      },
      addText(runs: unknown, options: Record<string, unknown>) {
        calls.push({ kind: 'text', runs, options });
        return this;
      },
    } as unknown as pptxgen.Slide;
    slides.push(slide);
    return slide;
  };

  const pptx = {
    addSlide() {
      added += 1;
      return makeSlide();
    },
    ShapeType: { rect: 'rect', line: 'line' },
  } as unknown as pptxgen;

  return { pptx, calls, slides, slideCount: () => added };
}

function imageCalls(calls: RecordedCall[]): RecordedImage[] {
  return calls.filter((c): c is RecordedImage => c.kind === 'image');
}

function shapeCalls(calls: RecordedCall[]): RecordedShape[] {
  return calls.filter((c): c is RecordedShape => c.kind === 'shape');
}

function textCalls(calls: RecordedCall[]): RecordedText[] {
  return calls.filter((c): c is RecordedText => c.kind === 'text');
}

// ---------------------------------------------------------------------------
// addProjectStatusSlide (VISION §18, §19)
// ---------------------------------------------------------------------------

describe('addProjectStatusSlide', () => {
  it('renders the VISION §18 example initiative from samples/full-sprint.json', () => {
    const deck = makeRecordingDeck();
    // The sample presentation product is "atlas", so the archetype pairs with
    // the Atlas product theme (VISION §9).
    const ctx = createContextForProduct('atlas');
    addProjectStatusSlide(deck.pptx, ctx, loadValidatedProject('full-sprint'));

    // Exactly one slide for one initiative (VISION §19).
    expect(deck.slideCount()).toBe(1);
    expect(deck.slides[0]?.background).toEqual({ color: Colors.backgroundDark });

    const images = imageCalls(deck.calls);
    const texts = textCalls(deck.calls);
    const shapes = shapeCalls(deck.calls);

    // Level 1 — application header: header bar + divider, project icon,
    // initiative title, and the mapped status indicator (VISION §10, §18).
    expect(shapes.map((s) => s.shapeName)).toEqual(['rect', 'line']);
    expect(shapes[0]?.options.fill).toEqual({ color: ctx.productTheme?.accent });
    expect(images[0]?.data).toBe(resolveIcon('project').data);
    expect(texts[0]?.runs).toEqual([
      { text: 'Workspace Assistant Rollout', options: { bold: true } },
    ]);
    // "on-track" maps to the healthy status indicator (VISION §8, §39).
    expect(images.map((i) => i.data)).toContain(resolveIcon('healthy').data);

    // Level 2 — one phase heading per phase, stacked in a single column.
    const headings = texts.filter((t) => t.options.fontSize === Typography.scale.h3);
    expect(headings.map((t) => t.runs)).toEqual(['Pilot Expansion', 'Production Readiness']);
    expect(images.filter((i) => i.data === resolveIcon('phase').data)).toHaveLength(2);

    // Level 3 — epic marker icons + titles, grouped under each phase.
    const epicTitles = texts.filter(
      (t) =>
        t.options.fontSize === Typography.scale.body && t.options.color === Colors.textSecondary,
    );
    expect(epicTitles.map((t) => t.runs)).toEqual([
      'Expand pilot population',
      'Establish usage telemetry',
      'Finalize support model',
      'Publish user guidance',
    ]);
    expect(images.filter((i) => i.data === resolveIcon('epic').data)).toHaveLength(4);

    // Phase geometry (VISION §29): the first phase starts below the header
    // divider; the second starts one phase-extent plus the section gap below.
    const lineHeight = (Typography.scale.body / 72) * Typography.lineSpacing.loose;
    const headingHeight = (Typography.scale.h3 / 72) * Typography.lineSpacing.loose;
    const firstPhaseExtent = headingHeight + Spacing.sm + 2 * lineHeight + Spacing.xs;
    expect(headings[0]?.options.y).toBe(Layout.content.top + Spacing.md);
    expect(headings[1]?.options.y).toBeCloseTo(
      Layout.content.top + Spacing.md + firstPhaseExtent + Spacing.lg,
      10,
    );
  });

  it('renders one initiative per slide (VISION §19)', () => {
    const deck = makeRecordingDeck();
    const ctx = createDefaultContext();
    addProjectStatusSlide(deck.pptx, ctx, loadValidatedProject('full-sprint'));
    // projects-only.json carries two initiatives — each gets its own slide.
    const doc = validatePresentation(loadSample('projects-only'));
    for (const project of doc.presentation.projects) {
      addProjectStatusSlide(deck.pptx, ctx, project);
    }
    expect(deck.slideCount()).toBe(3);
  });

  it('maps each project status onto the shared status-icon vocabulary (VISION §18, §39)', () => {
    const cases: Array<[ProjectStatus, string]> = [
      ['on-track', 'healthy'],
      ['at-risk', 'attention'],
      ['blocked', 'blocked'],
      ['complete', 'complete'],
    ];
    for (const [status, indicator] of cases) {
      const deck = makeRecordingDeck();
      addProjectStatusSlide(deck.pptx, createDefaultContext(), {
        id: 'status-probe',
        title: `Status Probe ${status}`,
        icon: 'project',
        status,
        phases: [],
      });
      expect(imageCalls(deck.calls).map((i) => i.data)).toContain(resolveIcon(indicator).data);
    }
  });

  it('fails loudly beyond the phase cap — overflow is a validation problem (VISION §30)', () => {
    const deck = makeRecordingDeck();
    const phases = Array.from({ length: PROJECT_STATUS_CONSTRAINTS.phases.max + 1 }, (_, i) => ({
      title: `Phase ${i + 1}`,
      icon: 'phase',
      epics: [],
    }));
    expect(() =>
      addProjectStatusSlide(deck.pptx, createDefaultContext(), {
        id: 'too-many-phases',
        title: 'Overloaded Initiative',
        icon: 'project',
        status: 'on-track',
        phases,
      }),
    ).toThrow('at most 4 phases per initiative, got 5');
    expect(deck.calls).toHaveLength(0);
  });

  it('fails loudly beyond the epic cap — overflow is a validation problem (VISION §30)', () => {
    const deck = makeRecordingDeck();
    const epics = Array.from(
      { length: PROJECT_STATUS_CONSTRAINTS.epicsPerPhase.max + 1 },
      (_, i) => ({ title: `Epic ${i + 1}` }),
    );
    expect(() =>
      addProjectStatusSlide(deck.pptx, createDefaultContext(), {
        id: 'too-many-epics',
        title: 'Overloaded Initiative',
        icon: 'project',
        status: 'on-track',
        phases: [{ title: 'Phase One', icon: 'phase', epics }],
      }),
    ).toThrow('at most 5 epics per phase, got 6 for "Phase One"');
    expect(deck.calls).toHaveLength(0);
  });

  it('fails loudly beyond the epic title length cap — overflow is a validation problem (VISION §30)', () => {
    const deck = makeRecordingDeck();
    const tooLong = 'E'.repeat(PROJECT_STATUS_CONSTRAINTS.epicTitleLength.max + 1);
    expect(() =>
      addProjectStatusSlide(deck.pptx, createDefaultContext(), {
        id: 'long-epic-title',
        title: 'Wordy Initiative',
        icon: 'project',
        status: 'on-track',
        phases: [{ title: 'Phase One', icon: 'phase', epics: [{ title: tooLong }] }],
      }),
    ).toThrow('supports epic titles up to 90 characters, got 91');
    expect(deck.calls).toHaveLength(0);
  });

  it('fails loudly when within-limit content still cannot fit the content region (VISION §31)', () => {
    const deck = makeRecordingDeck();
    // 3 phases × 4 epics is within every constraint cap but cannot fit the
    // slide's content region — the renderer must never silently run off-slide.
    const phases = Array.from({ length: 3 }, (_, p) => ({
      title: `Phase ${p + 1}`,
      icon: 'phase',
      epics: Array.from({ length: 4 }, (_, e) => ({ title: `Epic ${e + 1}` })),
    }));
    expect(() =>
      addProjectStatusSlide(deck.pptx, createDefaultContext(), {
        id: 'dense-initiative',
        title: 'Dense Initiative',
        icon: 'project',
        status: 'on-track',
        phases,
      }),
    ).toThrow(/overflows the slide content region/);
  });

  it('renders identically across repeated calls (deterministic, ADR-0006)', () => {
    const project = loadValidatedProject('full-sprint');
    const ctx = createContextForProduct('atlas');
    const first = makeRecordingDeck();
    const second = makeRecordingDeck();
    addProjectStatusSlide(first.pptx, ctx, project);
    addProjectStatusSlide(second.pptx, ctx, project);
    expect(second.calls).toEqual(first.calls);
  });
});
