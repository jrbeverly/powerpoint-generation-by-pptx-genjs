import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import JSZip from 'jszip';
import pptxgen from 'pptxgenjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createContextForProduct } from '../src/catalog/products.js';
import {
  addApplicationHeader,
  addIcon,
  addPrimaryIcon,
  addProductIdentity,
  addStatusIndicator,
} from '../src/components/index.js';
import { buildComponentShowcaseDeck } from '../src/render.js';
import { STATUS_VALUES } from '../src/schema/common.js';
import { createDefaultContext } from '../src/theme/context.js';
import { Layout } from '../src/theme/layout.js';
import { Spacing } from '../src/theme/spacing.js';

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const SVG_DATA_URI_PREFIX = 'data:image/svg+xml;base64,';
const EMU_PER_INCH = 914400;

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
// addIcon / addPrimaryIcon
// ---------------------------------------------------------------------------

describe('addIcon', () => {
  it('places the resolved catalog asset at the explicit placement', () => {
    const { slide, calls } = makeRecordingSlide();
    addIcon(slide, 'release', { x: 1.25, y: 2.5, size: 0.6 });

    expect(calls).toHaveLength(1);
    const image = calls[0];
    expect(image).toMatchObject({ kind: 'image', x: 1.25, y: 2.5, w: 0.6, h: 0.6 });
    expect((image as RecordedImage).data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
  });

  it('fails loudly for unknown icon ids — never renders a placeholder (VISION §31)', () => {
    const { slide, calls } = makeRecordingSlide();
    expect(() => addIcon(slide, 'unknown-icon', { x: 0, y: 0, size: 0.5 })).toThrow(
      'Unknown icon id "unknown-icon"',
    );
    expect(calls).toHaveLength(0);
  });
});

describe('addPrimaryIcon', () => {
  it('draws the icon in the Layout.header primary slot (top-left "where am I?")', () => {
    const { slide, calls } = makeRecordingSlide();
    addPrimaryIcon(slide, createDefaultContext(), 'project');

    expect(imageCalls(calls)).toEqual([
      expect.objectContaining({
        x: Layout.header.primaryIconX,
        y: Layout.header.primaryIconY,
        w: Layout.header.primaryIconSize,
        h: Layout.header.primaryIconSize,
      }),
    ]);
  });
});

// ---------------------------------------------------------------------------
// addStatusIndicator
// ---------------------------------------------------------------------------

describe('addStatusIndicator', () => {
  it('defaults to the Layout.header state slot (top-right, VISION §10)', () => {
    const { slide, calls } = makeRecordingSlide();
    addStatusIndicator(slide, createDefaultContext(), 'healthy');

    expect(imageCalls(calls)).toEqual([
      expect.objectContaining({
        x: Layout.header.stateRight,
        y: Layout.header.stateIconY,
        w: Layout.header.stateIconSize,
        h: Layout.header.stateIconSize,
      }),
    ]);
  });

  it('accepts an explicit placement for in-content use', () => {
    const { slide, calls } = makeRecordingSlide();
    addStatusIndicator(slide, createDefaultContext(), 'attention', { x: 4, y: 5, size: 0.35 });

    expect(imageCalls(calls)).toEqual([expect.objectContaining({ x: 4, y: 5, w: 0.35, h: 0.35 })]);
  });

  it('resolves every semantic status to its catalog asset', () => {
    for (const status of STATUS_VALUES) {
      const { slide, calls } = makeRecordingSlide();
      addStatusIndicator(slide, createDefaultContext(), status);
      expect(imageCalls(calls)).toHaveLength(1);
      expect(imageCalls(calls)[0]?.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// addProductIdentity
// ---------------------------------------------------------------------------

describe('addProductIdentity', () => {
  it('is a no-op when the context carries no product theme (VISION §9)', () => {
    const { slide, calls } = makeRecordingSlide();
    addProductIdentity(slide, createDefaultContext());
    expect(calls).toHaveLength(0);
  });

  it('renders the product logo in the header right zone by default', () => {
    const ctx = createContextForProduct('atlas');
    const { slide, calls } = makeRecordingSlide();
    addProductIdentity(slide, ctx);

    const H = Layout.header;
    expect(imageCalls(calls)).toEqual([
      expect.objectContaining({
        data: ctx.productTheme?.logo.data,
        x: H.stateRight - H.productLogoGap - H.productLogoW,
        y: (H.height - H.productLogoH) / 2,
        w: H.productLogoW,
        h: H.productLogoH,
      }),
    ]);
  });

  it('renders the square product icon variant in the state slot', () => {
    const ctx = createContextForProduct('beacon');
    const { slide, calls } = makeRecordingSlide();
    addProductIdentity(slide, ctx, { variant: 'icon' });

    const H = Layout.header;
    expect(imageCalls(calls)).toEqual([
      expect.objectContaining({
        data: ctx.productTheme?.icon.data,
        x: H.stateRight,
        y: H.stateIconY,
        w: H.stateIconSize,
        h: H.stateIconSize,
      }),
    ]);
  });

  it('accepts an explicit placement override', () => {
    const ctx = createContextForProduct('nimbus');
    const { slide, calls } = makeRecordingSlide();
    addProductIdentity(slide, ctx, { x: 3, y: 4 });

    expect(imageCalls(calls)).toEqual([
      expect.objectContaining({ x: 3, y: 4, w: Layout.header.productLogoW }),
    ]);
  });
});

// ---------------------------------------------------------------------------
// addApplicationHeader (VISION §10)
// ---------------------------------------------------------------------------

const HEADER_CONTENT = {
  icon: 'project',
  title: 'Authentication Change',
  location: 'Platform Engineering',
  status: 'attention',
} as const;

describe('addApplicationHeader', () => {
  it('draws bar → primary icon → title → logo → status → divider, in order', () => {
    const pptx = new pptxgen();
    const { slide, calls } = makeRecordingSlide();
    addApplicationHeader(pptx, slide, createContextForProduct('atlas'), HEADER_CONTENT);

    expect(calls.map((c) => c.kind)).toEqual([
      'shape', // header bar
      'image', // primary icon
      'text', // title / location
      'image', // product logo
      'image', // status icon
      'shape', // content divider
    ]);
  });

  it('reads every coordinate from Layout — icon+title left, product+state right', () => {
    const pptx = new pptxgen();
    const ctx = createContextForProduct('atlas');
    const { slide, calls } = makeRecordingSlide();
    addApplicationHeader(pptx, slide, ctx, HEADER_CONTENT);

    const H = Layout.header;
    const [bar, divider] = shapeCalls(calls);
    const [icon, logo, statusIcon] = imageCalls(calls);
    const [title] = textCalls(calls);

    // Full-bleed bar from the slide origin.
    expect(bar).toMatchObject({
      shapeName: 'rect',
      options: {
        x: 0,
        y: 0,
        w: Layout.slide.width,
        h: H.height,
        fill: { color: ctx.productTheme?.accent },
        line: { type: 'none' },
      },
    });

    // Icon + title on the left.
    expect(icon).toMatchObject({ x: H.primaryIconX, y: H.primaryIconY });
    expect(title?.options).toMatchObject({
      x: H.titleX,
      y: H.titleY,
      w: H.stateRight - H.productLogoGap - H.productLogoW - H.titleX - Spacing.md,
      h: H.titleHeight,
    });

    // Product identity + state on the right.
    expect(logo).toMatchObject({
      x: H.stateRight - H.productLogoGap - H.productLogoW,
      y: (H.height - H.productLogoH) / 2,
    });
    expect(statusIcon).toMatchObject({ x: H.stateRight, y: H.stateIconY });

    // Divider marks the top of the content region.
    expect(divider).toMatchObject({
      shapeName: 'line',
      options: {
        x: Layout.content.left,
        y: Layout.content.top,
        w: Layout.content.right - Layout.content.left,
      },
    });
  });

  it('renders the title with the location joined as "TITLE / LOCATION"', () => {
    const pptx = new pptxgen();
    const { slide, calls } = makeRecordingSlide();
    addApplicationHeader(pptx, slide, createDefaultContext(), {
      icon: 'advisory',
      title: 'Authentication Change',
      location: 'Identity Platform',
    });

    const [title] = textCalls(calls);
    expect(title?.runs).toEqual([
      { text: 'Authentication Change', options: { bold: true } },
      {
        text: ' / Identity Platform',
        options: { bold: false, color: createDefaultContext().colors.textSecondary },
      },
    ]);
  });

  it('omits product identity and status when absent, extending the title to the right zone', () => {
    const pptx = new pptxgen();
    const { slide, calls } = makeRecordingSlide();
    addApplicationHeader(pptx, slide, createDefaultContext(), {
      icon: 'sprint',
      title: 'Sprint 42 Overview',
    });

    expect(calls.map((c) => c.kind)).toEqual(['shape', 'image', 'text', 'shape']);
    const [title] = textCalls(calls);
    expect(title?.options).toMatchObject({
      w: Layout.header.stateRight - Layout.header.titleX - Spacing.md,
    });
  });

  it('renders identically across repeated calls (deterministic, ADR-0006)', () => {
    const pptx = new pptxgen();
    const ctx = createContextForProduct('atlas');
    const first = makeRecordingSlide();
    const second = makeRecordingSlide();

    addApplicationHeader(pptx, first.slide, ctx, HEADER_CONTENT);
    addApplicationHeader(pptx, second.slide, ctx, HEADER_CONTENT);

    expect(second.calls).toEqual(first.calls);
  });
});

// ---------------------------------------------------------------------------
// Component showcase deck (definition of done)
// ---------------------------------------------------------------------------

describe('component showcase deck', () => {
  let workDir: string;
  let bytes: Buffer;

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'pptx-components-'));
    const fileName = await buildComponentShowcaseDeck().writeFile({
      fileName: join(workDir, 'components-demo.pptx'),
    });
    bytes = await readFile(fileName);
  });

  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('writes a valid ZIP/OPC package', () => {
    expect(bytes.subarray(0, 4)).toEqual(ZIP_MAGIC);
    expect(bytes.length).toBeGreaterThan(1024);
  });

  it('renders one test slide per component in isolation', () => {
    const listing = bytes.toString('latin1');
    expect(listing).toContain('ppt/slides/slide1.xml');
    expect(listing).toContain('ppt/slides/slide2.xml');
    expect(listing).toContain('ppt/slides/slide3.xml');
    expect(listing).toContain('ppt/slides/slide4.xml');
    expect(listing).toContain('ppt/slides/slide5.xml');
    expect(listing).toContain('ppt/slides/slide6.xml');
    expect(listing).toContain('ppt/slides/slide7.xml');
    expect(listing).toContain('ppt/slides/slide8.xml');
    expect(listing).not.toContain('ppt/slides/slide9.xml');
  });

  it('embeds the catalog SVG media and product accents', () => {
    const listing = bytes.toString('latin1');
    expect(listing).toContain('asvg:svgBlip');
    expect(listing).toContain('image/svg+xml');
    // Header slide carries the Atlas accent; product slide embeds the Beacon logo.
    expect(listing).toContain('#6366F1');
    expect(listing).toContain('#F59E0B');
  });

  it('renders the header title and location on slide 1', async () => {
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file('ppt/slides/slide1.xml')?.async('string');
    expect(xml).toContain('Workspace Assistant Rollout');
    expect(xml).toContain(' / Platform Engineering');
  });

  it('renders the metric card and phase hierarchy on their test slides', async () => {
    const zip = await JSZip.loadAsync(bytes);
    // Slide 6 — catalog-formatted value and short label (VISION §15).
    const metricXml = await zip.file('ppt/slides/slide6.xml')?.async('string');
    expect(metricXml).toContain('64%');
    expect(metricXml).toContain('Adoption');
    expect(metricXml).toContain('38 items');
    // Slide 8 — phase heading and epic titles (VISION §18).
    const phaseXml = await zip.file('ppt/slides/slide8.xml')?.async('string');
    expect(phaseXml).toContain('Pilot Expansion');
    expect(phaseXml).toContain('Expand pilot population');
    expect(phaseXml).toContain('Production Readiness');
  });
});

// ---------------------------------------------------------------------------
// End-to-end determinism + VISION §10 layout (ADR-0005, ADR-0006)
// ---------------------------------------------------------------------------

/** Builds a one-slide deck consisting solely of the application header. */
function buildHeaderDeck(): pptxgen {
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_WIDE';

  const ctx = createContextForProduct('atlas');
  const slide = pptx.addSlide();
  slide.background = { color: ctx.colors.backgroundDark };
  addApplicationHeader(pptx, slide, ctx, HEADER_CONTENT);

  return pptx;
}

async function listParts(bytes: Uint8Array): Promise<Array<{ name: string; content: string }>> {
  const zip = await JSZip.loadAsync(bytes);
  const parts: Array<{ name: string; content: string }> = [];
  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) {
      parts.push({ name, content: await entry.async('string') });
    }
  }
  return parts;
}

describe('header end-to-end (ADR-0005, ADR-0006)', () => {
  let first: Uint8Array;
  let second: Uint8Array;
  let slideXml: string;

  beforeAll(async () => {
    first = (await buildHeaderDeck().write({ outputType: 'nodebuffer' })) as Uint8Array;
    second = (await buildHeaderDeck().write({ outputType: 'nodebuffer' })) as Uint8Array;
    slideXml = (await listParts(first)).find((p) => p.name === 'ppt/slides/slide1.xml')!.content;
  });

  it('renders the header identically across repeated deck builds (structural equality)', async () => {
    const firstParts = await listParts(first);
    const secondParts = await listParts(second);

    const names = firstParts.map((p) => p.name);
    expect(secondParts.map((p) => p.name)).toEqual(names);

    for (const part of firstParts) {
      if (part.name === 'docProps/core.xml') {
        continue; // wall-clock timestamps are the only allowed difference (ADR-0006)
      }
      const counterpart = secondParts.find((p) => p.name === part.name);
      expect(counterpart?.content).toBe(part.content);
    }
  });

  it('places icon+title left and product+state right (VISION §10 geometry)', () => {
    // The first a:off is the slide's own group transform; the following pairs
    // are the shapes in insertion order (verified against PptxGenJS output).
    const offsets = [...slideXml.matchAll(/<a:off x="(\d+)" y="(\d+)"\/>/g)].map((match) => {
      const x = match[1];
      const y = match[2];
      if (x === undefined || y === undefined) {
        throw new Error(`unparseable a:off in slide XML: ${match[0]}`);
      }
      return { x: Number(x), y: Number(y) };
    });

    const emu = (inches: number): number => Math.round(inches * EMU_PER_INCH);
    const H = Layout.header;

    expect(offsets.slice(1)).toEqual([
      { x: 0, y: 0 }, // header bar, full bleed from the slide origin
      { x: emu(H.primaryIconX), y: emu(H.primaryIconY) }, // primary icon — left
      { x: emu(H.titleX), y: emu(H.titleY) }, // title — left
      {
        x: emu(H.stateRight - H.productLogoGap - H.productLogoW),
        y: emu((H.height - H.productLogoH) / 2),
      }, // product logo — right
      { x: emu(H.stateRight), y: emu(H.stateIconY) }, // status icon — far right
      { x: emu(Layout.content.left), y: emu(Layout.content.top) }, // content divider
    ]);
  });
});
