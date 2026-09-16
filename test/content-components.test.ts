import pptxgen from 'pptxgenjs';
import { describe, expect, it } from 'vitest';

import { getMetricDefinition, formatMetricValue } from '../src/catalog/metrics.js';
import { resolveIcon } from '../src/catalog/icons.js';
import { createContextForProduct } from '../src/catalog/products.js';
import {
  addBulletGroup,
  addEpic,
  addMetric,
  addPhase,
  addProgressBar,
} from '../src/components/index.js';
import { Colors } from '../src/theme/colors.js';
import { createDefaultContext } from '../src/theme/context.js';
import { Layout } from '../src/theme/layout.js';
import { Spacing } from '../src/theme/spacing.js';
import { Typography } from '../src/theme/typography.js';

const SVG_DATA_URI_PREFIX = 'data:image/svg+xml;base64,';

// ---------------------------------------------------------------------------
// Recording slide: captures every component call for geometry assertions
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

/** A fake `pptxgen.Slide` that records draw calls instead of rendering. */
function makeRecordingSlide(): { slide: pptxgen.Slide; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const slide = {
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
  return { slide, calls };
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
// addBulletGroup (VISION §28, §30)
// ---------------------------------------------------------------------------

describe('addBulletGroup', () => {
  const BULLETS = ['Pilot group expanded', 'Weekly active usage continues to increase'] as const;

  it('renders bullets as "• text" at body scale with theme-derived geometry', () => {
    const { slide, calls } = makeRecordingSlide();
    addBulletGroup(slide, createDefaultContext(), BULLETS, { x: 0.6, y: 1.35, width: 12 });

    const lineHeight = (Typography.scale.body / 72) * Typography.lineSpacing.loose;
    const [first, second] = textCalls(calls);
    expect(first).toEqual(
      expect.objectContaining({
        runs: `• ${BULLETS[0]}`,
        options: {
          x: 0.6,
          y: 1.35,
          w: 12,
          h: lineHeight,
          fontFace: Typography.fontFamily,
          fontSize: Typography.scale.body,
          color: Colors.textSecondary,
          valign: 'top',
        },
      }),
    );
    expect(second?.runs).toBe(`• ${BULLETS[1]}`);
    expect(second?.options).toMatchObject({ x: 0.6, w: 12 });
    // Consistent gap between bullets (VISION §28).
    expect(second?.options.y).toBeCloseTo(1.35 + lineHeight + Spacing.sm, 10);
  });

  it('returns the vertical extent used so callers can stack content below', () => {
    const { slide } = makeRecordingSlide();
    const lineHeight = (Typography.scale.body / 72) * Typography.lineSpacing.loose;
    const height = addBulletGroup(slide, createDefaultContext(), BULLETS, {
      x: 0,
      y: 0,
      width: 4,
    });
    expect(height).toBe(2 * lineHeight + Spacing.sm);
  });

  it('fails loudly beyond the bullet cap — overflow is a validation problem (VISION §30)', () => {
    const { slide, calls } = makeRecordingSlide();
    expect(() =>
      addBulletGroup(slide, createDefaultContext(), ['a', 'b', 'c', 'd'], {
        x: 0,
        y: 0,
        width: 4,
      }),
    ).toThrow('at most 3 bullets, got 4');
    expect(calls).toHaveLength(0);
  });

  it('renders identically across repeated calls (deterministic, ADR-0006)', () => {
    const first = makeRecordingSlide();
    const second = makeRecordingSlide();
    addBulletGroup(first.slide, createDefaultContext(), BULLETS, { x: 0.6, y: 1.35, width: 12 });
    addBulletGroup(second.slide, createDefaultContext(), BULLETS, { x: 0.6, y: 1.35, width: 12 });
    expect(second.calls).toEqual(first.calls);
  });
});

// ---------------------------------------------------------------------------
// addMetric (VISION §14, §15, §17)
// ---------------------------------------------------------------------------

describe('addMetric', () => {
  it('resolves icon, label, and value formatting from the metric catalog, not raw input', () => {
    const { slide, calls } = makeRecordingSlide();
    addMetric(
      slide,
      createDefaultContext(),
      { metric: 'adoption', value: 64, trend: 'up', status: 'attention' },
      { x: 2, y: 3, width: 5 },
    );

    const definition = getMetricDefinition('adoption');
    const [icon] = imageCalls(calls);
    const [value] = textCalls(calls);
    const [statusIcon] = imageCalls(calls).slice(1);
    const labelText = textCalls(calls)[1];

    // Icon asset comes from the catalog definition (VISION §14, §40).
    expect(icon).toEqual(
      expect.objectContaining({ data: definition.icon.data, x: 2, y: 3, w: 0.45, h: 0.45 }),
    );
    expect(icon?.data).toBe(resolveIcon('adoption').data);

    // Value is formatted by the catalog (64 → "64%") with the trend glyph.
    expect(value?.runs).toEqual([
      { text: formatMetricValue(definition, 64), options: { bold: true } },
      { text: ' ↑', options: { color: Colors.healthy } },
    ]);
    expect(value?.options).toMatchObject({
      fontSize: Typography.scale.h2,
      color: Colors.textPrimary,
    });

    // Label is the catalog short label, not anything the caller supplied.
    expect(labelText?.runs).toBe('Adoption');
    expect(labelText?.runs).toBe(definition.shortLabel);
    expect(labelText?.options).toMatchObject({
      fontSize: Typography.scale.small,
      color: Colors.textMuted,
    });

    // Optional state indicator sits in the card's top-right corner.
    expect(statusIcon).toEqual(
      expect.objectContaining({
        data: resolveIcon('attention').data,
        x: 2 + 5 - 0.3,
        y: 3 + (0.45 - 0.3) / 2,
        w: 0.3,
        h: 0.3,
      }),
    );
  });

  it('omits the trend arrow when no trend is supplied', () => {
    const { slide, calls } = makeRecordingSlide();
    addMetric(
      slide,
      createDefaultContext(),
      { metric: 'throughput', value: 38 },
      {
        x: 0,
        y: 0,
        width: 4,
      },
    );

    const [value] = textCalls(calls);
    expect(value?.runs).toEqual([{ text: '38 items', options: { bold: true } }]);
    // No status supplied → no status icon either.
    expect(imageCalls(calls)).toHaveLength(1);
  });

  it('renders the full catalog label for detail slides (VISION §17)', () => {
    const { slide, calls } = makeRecordingSlide();
    addMetric(
      slide,
      createDefaultContext(),
      { metric: 'operational-health', value: 96, trend: 'flat' },
      { x: 0, y: 0, width: 4 },
      { labelStyle: 'full' },
    );

    const labelText = textCalls(calls)[1];
    expect(labelText?.runs).toBe('Operational Health');
    expect(labelText?.runs).toBe(getMetricDefinition('operational-health').label);
    // Flat trend uses the muted arrow color.
    const [value] = textCalls(calls);
    expect(value?.runs).toEqual([
      { text: '96%', options: { bold: true } },
      { text: ' →', options: { color: Colors.textMuted } },
    ]);
  });

  it('returns the card height so callers can stack cards in a grid', () => {
    const { slide } = makeRecordingSlide();
    const height = addMetric(
      slide,
      createDefaultContext(),
      { metric: 'quality', value: 87 },
      {
        x: 0,
        y: 0,
        width: 4,
      },
    );
    const labelHeight = (Typography.scale.small / 72) * Typography.lineSpacing.loose;
    expect(height).toBe(0.45 + Spacing.xs + labelHeight);
  });

  it('fails loudly for unknown metric ids — never renders a placeholder (VISION §31)', () => {
    const { slide, calls } = makeRecordingSlide();
    expect(() =>
      addMetric(
        slide,
        createDefaultContext(),
        // @ts-expect-error — testing the loud-failure path with a non-catalog id
        { metric: 'not-a-metric', value: 50 },
        { x: 0, y: 0, width: 4 },
      ),
    ).toThrow('Unknown metric id "not-a-metric"');
    expect(calls).toHaveLength(0);
  });

  it('renders identically across repeated calls (deterministic, ADR-0006)', () => {
    const first = makeRecordingSlide();
    const second = makeRecordingSlide();
    const content = { metric: 'adoption' as const, value: 64, trend: 'up' as const };
    addMetric(first.slide, createDefaultContext(), content, { x: 2, y: 3, width: 5 });
    addMetric(second.slide, createDefaultContext(), content, { x: 2, y: 3, width: 5 });
    expect(second.calls).toEqual(first.calls);
  });
});

// ---------------------------------------------------------------------------
// addProgressBar (VISION §16)
// ---------------------------------------------------------------------------

describe('addProgressBar', () => {
  const pptx = new pptxgen();

  it('draws track + proportional accent fill for the selected emphasis', () => {
    const ctx = createContextForProduct('atlas');
    const { slide, calls } = makeRecordingSlide();
    addProgressBar(pptx, slide, ctx, { x: 1, y: 2, width: 4 }, { value: 64 });

    expect(calls.map((c) => c.kind)).toEqual(['shape', 'shape']);
    const [track, fill] = shapeCalls(calls);
    expect(track).toEqual(
      expect.objectContaining({
        shapeName: 'rect',
        options: {
          x: 1,
          y: 2,
          w: 4,
          h: 0.12,
          fill: { color: Colors.backgroundMid },
          line: { type: 'none' },
        },
      }),
    );
    // Fill length is proportional to the value; selected uses the product accent.
    expect(fill).toEqual(
      expect.objectContaining({
        shapeName: 'rect',
        options: {
          x: 1,
          y: 2,
          w: 4 * 0.64,
          h: 0.12,
          fill: { color: ctx.productTheme?.accent, transparency: 0 },
          line: { type: 'none' },
        },
      }),
    );
  });

  it('renders the muted emphasis dimmed (VISION §16)', () => {
    const { slide, calls } = makeRecordingSlide();
    addProgressBar(
      pptx,
      slide,
      createDefaultContext(),
      { x: 0, y: 0, width: 4 },
      {
        value: 92,
        emphasis: 'muted',
      },
    );

    const [, fill] = shapeCalls(calls);
    expect(fill?.options).toEqual(
      expect.objectContaining({ fill: { color: Colors.textMuted, transparency: 40 } }),
    );
  });

  it('clamps out-of-range values instead of overflowing the track', () => {
    const over = makeRecordingSlide();
    addProgressBar(
      pptx,
      over.slide,
      createDefaultContext(),
      { x: 0, y: 0, width: 4 },
      {
        value: 150,
      },
    );
    const [, overFill] = shapeCalls(over.calls);
    expect(overFill?.options).toMatchObject({ w: 4 });

    const under = makeRecordingSlide();
    addProgressBar(
      pptx,
      under.slide,
      createDefaultContext(),
      { x: 0, y: 0, width: 4 },
      {
        value: -5,
      },
    );
    expect(shapeCalls(under.calls)).toHaveLength(1); // track only
  });

  it('renders identically across repeated calls (deterministic, ADR-0006)', () => {
    const first = makeRecordingSlide();
    const second = makeRecordingSlide();
    addProgressBar(
      pptx,
      first.slide,
      createDefaultContext(),
      { x: 1, y: 2, width: 4 },
      {
        value: 64,
        emphasis: 'selected',
      },
    );
    addProgressBar(
      pptx,
      second.slide,
      createDefaultContext(),
      { x: 1, y: 2, width: 4 },
      {
        value: 64,
        emphasis: 'selected',
      },
    );
    expect(second.calls).toEqual(first.calls);
  });
});

// ---------------------------------------------------------------------------
// addEpic / addPhase (VISION §18)
// ---------------------------------------------------------------------------

describe('addEpic', () => {
  it('renders the epic marker icon plus the title at body scale', () => {
    const { slide, calls } = makeRecordingSlide();
    const height = addEpic(
      slide,
      createDefaultContext(),
      { title: 'Expand pilot population' },
      {
        x: 1,
        y: 2,
        width: 6,
      },
    );

    const iconSize = Typography.scale.body / 72;
    const lineHeight = (Typography.scale.body / 72) * Typography.lineSpacing.loose;
    const [icon] = imageCalls(calls);
    const [title] = textCalls(calls);

    expect(icon).toEqual(
      expect.objectContaining({
        data: resolveIcon('epic').data,
        x: 1,
        y: 2 + (lineHeight - iconSize) / 2,
        w: iconSize,
        h: iconSize,
      }),
    );
    expect(title?.runs).toBe('Expand pilot population');
    expect(title?.options).toEqual(
      expect.objectContaining({
        x: 1 + iconSize + Spacing.xs,
        y: 2,
        w: 6 - iconSize - Spacing.xs,
        h: lineHeight,
        fontSize: Typography.scale.body,
        color: Colors.textSecondary,
      }),
    );
    expect(height).toBe(lineHeight);
  });
});

describe('addPhase', () => {
  const PHASE = {
    title: 'Pilot Expansion',
    icon: 'phase',
    epics: [{ title: 'Expand pilot population' }, { title: 'Establish usage telemetry' }],
  } as const;

  it('renders phase icon + heading (level 2) and stacks its epics (level 3)', () => {
    const { slide, calls } = makeRecordingSlide();
    addPhase(slide, createDefaultContext(), PHASE, { x: 0.6, y: 1.35, width: 12 });

    const phaseIconSize = Typography.scale.h3 / 72;
    const iconSize = Typography.scale.body / 72;

    // Level 2: phase icon + bold heading, then two epic lines.
    expect(calls.map((c) => c.kind)).toEqual(['image', 'text', 'image', 'text', 'image', 'text']);

    const [phaseIcon] = imageCalls(calls);
    expect(phaseIcon).toEqual(
      expect.objectContaining({ data: resolveIcon('phase').data, x: 0.6, y: 1.35 }),
    );

    const [heading] = textCalls(calls);
    expect(heading?.runs).toBe('Pilot Expansion');
    expect(heading?.options).toEqual(
      expect.objectContaining({
        x: 0.6 + phaseIconSize + Spacing.sm,
        fontSize: Typography.scale.h3,
        bold: true,
        color: Colors.textPrimary,
      }),
    );

    // Epics are indented to align under the heading text.
    const epicIcons = imageCalls(calls).slice(1);
    expect(epicIcons).toEqual([
      expect.objectContaining({ data: resolveIcon('epic').data, x: 0.6 + phaseIconSize }),
      expect.objectContaining({ data: resolveIcon('epic').data, x: 0.6 + phaseIconSize }),
    ]);
    const epicTitles = textCalls(calls).slice(1);
    expect(epicTitles.map((t) => t?.runs)).toEqual([
      'Expand pilot population',
      'Establish usage telemetry',
    ]);
    for (const title of epicTitles) {
      expect(title?.options).toMatchObject({ x: 0.6 + phaseIconSize + iconSize + Spacing.xs });
    }
  });

  it('returns the vertical extent used so callers can stack phase blocks', () => {
    const { slide } = makeRecordingSlide();
    const headingHeight = (Typography.scale.h3 / 72) * Typography.lineSpacing.loose;
    const lineHeight = (Typography.scale.body / 72) * Typography.lineSpacing.loose;
    const height = addPhase(slide, createDefaultContext(), PHASE, { x: 0.6, y: 1.35, width: 12 });
    expect(height).toBeCloseTo(headingHeight + Spacing.sm + 2 * lineHeight + Spacing.xs, 10);
  });

  it('fails loudly beyond the epic cap — overflow is a validation problem (VISION §30)', () => {
    const { slide, calls } = makeRecordingSlide();
    const epics = ['a', 'b', 'c', 'd', 'e', 'f'].map((title) => ({ title }));
    expect(() =>
      addPhase(
        slide,
        createDefaultContext(),
        { title: 'Too Many Epics', icon: 'phase', epics },
        {
          x: 0,
          y: 0,
          width: 12,
        },
      ),
    ).toThrow('at most 5 epics per phase, got 6 for "Too Many Epics"');
    expect(calls).toHaveLength(0);
  });

  it('renders identically across repeated calls (deterministic, ADR-0006)', () => {
    const first = makeRecordingSlide();
    const second = makeRecordingSlide();
    addPhase(first.slide, createDefaultContext(), PHASE, { x: 0.6, y: 1.35, width: 12 });
    addPhase(second.slide, createDefaultContext(), PHASE, { x: 0.6, y: 1.35, width: 12 });
    expect(second.calls).toEqual(first.calls);
  });
});

// ---------------------------------------------------------------------------
// Theme/layout contract (acceptance criteria)
// ---------------------------------------------------------------------------

describe('content components and the theme contract', () => {
  it('reads only theme-derived values — no inline geometry leaks into the output', () => {
    // Render one of each component from a Layout-derived placement and assert
    // that every emitted coordinate/color traces back to the theme constants.
    const { slide, calls } = makeRecordingSlide();
    const ctx = createDefaultContext();
    const x = Layout.content.left;
    const y = Layout.content.top + Spacing.md;
    const width = Layout.content.right - Layout.content.left;

    addBulletGroup(slide, ctx, ['First bullet'], { x, y, width });
    addMetric(slide, ctx, { metric: 'quality', value: 87 }, { x, y, width });
    addPhase(slide, ctx, { title: 'Phase', icon: 'phase', epics: [] }, { x, y, width });

    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      if (call.kind === 'image') {
        expect(call.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
      }
    }
  });
});
