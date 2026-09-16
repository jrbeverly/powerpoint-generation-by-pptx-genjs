import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import pptxgen from 'pptxgenjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  PRODUCT_IDS,
  createContextForProduct,
  isKnownProductId,
  resolveProductTheme,
} from '../src/catalog/products.js';
import { buildProductThemeDeck } from '../src/render.js';
import type { ProductTheme } from '../src/theme/context.js';

const SVG_DATA_URI_PREFIX = 'data:image/svg+xml;base64,';
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

// ---------------------------------------------------------------------------
// isKnownProductId
// ---------------------------------------------------------------------------

describe('isKnownProductId', () => {
  it('recognises all four mock products', () => {
    for (const id of PRODUCT_IDS) {
      expect(isKnownProductId(id)).toBe(true);
    }
  });

  it('rejects unknown ids', () => {
    for (const unknown of ['', 'product-alpha', 'ATLAS', 'atlas-logo', 'mock']) {
      expect(isKnownProductId(unknown)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveProductTheme — happy path
// ---------------------------------------------------------------------------

describe('resolveProductTheme — all four mock products', () => {
  it('resolves atlas with indigo accent and svg assets', () => {
    const theme = resolveProductTheme('atlas');
    expect(theme.id).toBe('atlas');
    expect(theme.accent).toBe('6366F1');
    expect(theme.secondaryAccent).toBe('818CF8');
    expect(theme.icon.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
    expect(theme.logo.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
  });

  it('resolves beacon with amber accent and svg assets', () => {
    const theme = resolveProductTheme('beacon');
    expect(theme.id).toBe('beacon');
    expect(theme.accent).toBe('F59E0B');
    expect(theme.secondaryAccent).toBe('FCD34D');
    expect(theme.icon.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
    expect(theme.logo.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
  });

  it('resolves nimbus with blue accent', () => {
    const theme = resolveProductTheme('nimbus');
    expect(theme.id).toBe('nimbus');
    expect(theme.accent).toBe('3B82F6');
  });

  it('resolves orbit with emerald accent', () => {
    const theme = resolveProductTheme('orbit');
    expect(theme.id).toBe('orbit');
    expect(theme.accent).toBe('10B981');
  });

  it('returns distinct icon assets for each product (visual continuity, VISION §40)', () => {
    const icons = PRODUCT_IDS.map((id) => resolveProductTheme(id).icon.data);
    expect(new Set(icons).size).toBe(PRODUCT_IDS.length);
  });

  it('returns distinct logo assets for each product', () => {
    const logos = PRODUCT_IDS.map((id) => resolveProductTheme(id).logo.data);
    expect(new Set(logos).size).toBe(PRODUCT_IDS.length);
  });

  it('returns the same theme object on repeated calls (referential stability)', () => {
    expect(resolveProductTheme('atlas')).toBe(resolveProductTheme('atlas'));
  });
});

// ---------------------------------------------------------------------------
// resolveProductTheme — unknown id fails loudly (VISION §31)
// ---------------------------------------------------------------------------

describe('resolveProductTheme — unknown product fails loudly', () => {
  it('throws for an empty string', () => {
    expect(() => resolveProductTheme('')).toThrow('Unknown product id ""');
  });

  it('throws for a plausible-but-wrong id and lists valid ids', () => {
    expect(() => resolveProductTheme('product-alpha')).toThrow(
      'Unknown product id "product-alpha"',
    );
    expect(() => resolveProductTheme('product-alpha')).toThrow('atlas');
  });

  it('throws for a case-variant of a known id', () => {
    expect(() => resolveProductTheme('ATLAS')).toThrow('Unknown product id "ATLAS"');
  });
});

// ---------------------------------------------------------------------------
// createContextForProduct — accent flows into RenderContext (VISION §9)
// ---------------------------------------------------------------------------

describe('createContextForProduct', () => {
  it('injects the product theme into RenderContext', () => {
    const ctx = createContextForProduct('atlas');
    expect(ctx.productTheme).toBeDefined();
    expect(ctx.productTheme?.id).toBe('atlas');
    expect(ctx.productTheme?.accent).toBe('6366F1');
  });

  it('preserves base layout, typography, spacing, and colors', () => {
    const ctx = createContextForProduct('beacon');
    expect(ctx.layout).toBeDefined();
    expect(ctx.typography).toBeDefined();
    expect(ctx.spacing).toBeDefined();
    expect(ctx.colors).toBeDefined();
  });

  it('produces independent contexts for different products', () => {
    const atlasCtx = createContextForProduct('atlas');
    const beaconCtx = createContextForProduct('beacon');
    // Accent differs — contexts are independent
    expect(atlasCtx.productTheme?.accent).not.toBe(beaconCtx.productTheme?.accent);
    // Base layout is shared (same object reference from createDefaultContext)
    expect(atlasCtx.layout).toBe(beaconCtx.layout);
  });

  it('fails loudly for an unknown product id', () => {
    expect(() => createContextForProduct('unknown')).toThrow('Unknown product id "unknown"');
  });

  it('icon and logo assets are embedded svg data URIs', () => {
    const ctx = createContextForProduct('nimbus');
    const theme = ctx.productTheme as ProductTheme;
    expect(theme.icon.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
    expect(theme.logo.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Archetype + product composition: same archetype, two products (VISION §9)
// ---------------------------------------------------------------------------

describe('product theme composition smoke test', () => {
  let workDir: string;
  let bytes: Buffer;

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'pptx-products-'));
    const pptx = buildProductThemeDeck();
    const fileName = await pptx.writeFile({ fileName: join(workDir, 'products-demo.pptx') });
    bytes = await readFile(fileName);
  });

  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('writes a valid ZIP/OPC package', () => {
    expect(bytes.subarray(0, 4)).toEqual(ZIP_MAGIC);
    expect(bytes.length).toBeGreaterThan(1024);
  });

  it('contains two slides — one per product', () => {
    const listing = bytes.toString('latin1');
    expect(listing).toContain('ppt/slides/slide1.xml');
    expect(listing).toContain('ppt/slides/slide2.xml');
    expect(listing).not.toContain('ppt/slides/slide3.xml');
  });

  it('embeds SVG media (product icons and logos)', () => {
    const listing = bytes.toString('latin1');
    expect(listing).toContain('ppt/media/');
    expect(listing).toContain('.svg');
    expect(listing).toContain('image/svg+xml');
  });

  it('contains atlas accent color in the slide XML', () => {
    const listing = bytes.toString('latin1');
    // Atlas accent 6366F1 appears as a shape fill in slide 1
    expect(listing).toContain('6366F1');
  });

  it('contains beacon accent color in the slide XML', () => {
    const listing = bytes.toString('latin1');
    // Beacon accent F59E0B appears as a shape fill in slide 2
    expect(listing).toContain('F59E0B');
  });
});

// ---------------------------------------------------------------------------
// Logo SVG content — mock logos are visually distinct per product
// ---------------------------------------------------------------------------

describe('product logo assets', () => {
  function decodeLogo(theme: ProductTheme): string {
    const prefix = SVG_DATA_URI_PREFIX;
    expect(theme.logo.data.startsWith(prefix)).toBe(true);
    return Buffer.from(theme.logo.data.slice(prefix.length), 'base64').toString('utf8');
  }

  it('atlas logo contains the accent color', () => {
    const svg = decodeLogo(resolveProductTheme('atlas'));
    expect(svg).toContain('#6366F1');
  });

  it('beacon logo contains the accent color', () => {
    const svg = decodeLogo(resolveProductTheme('beacon'));
    expect(svg).toContain('#F59E0B');
  });

  it('nimbus logo contains the accent color', () => {
    const svg = decodeLogo(resolveProductTheme('nimbus'));
    expect(svg).toContain('#3B82F6');
  });

  it('orbit logo contains the accent color', () => {
    const svg = decodeLogo(resolveProductTheme('orbit'));
    expect(svg).toContain('#10B981');
  });

  it('each logo is a valid SVG document', () => {
    for (const id of PRODUCT_IDS) {
      const svg = decodeLogo(resolveProductTheme(id));
      expect(svg).toMatch(/<svg[^>]+xmlns/);
    }
  });
});

// ---------------------------------------------------------------------------
// pptxgenjs integration: product icon used directly on a slide
// ---------------------------------------------------------------------------

describe('product icon integration', () => {
  let workDir: string;
  let bytes: Buffer;

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'pptx-product-icon-'));
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';

    const slide = pptx.addSlide();
    slide.background = { color: '1F2937' };

    // Advisory archetype icon + Atlas product icon + Beacon product icon
    // No per-product archetype code — each product theme is just data (VISION §9)
    const atlas = resolveProductTheme('atlas');
    const beacon = resolveProductTheme('beacon');
    slide.addImage({ data: atlas.icon.data }, { x: 0.5, y: 0.5, w: 0.6, h: 0.6 });
    slide.addImage({ data: atlas.logo.data }, { x: 1.3, y: 0.5, w: 1.6, h: 0.6 });
    slide.addImage({ data: beacon.icon.data }, { x: 3.2, y: 0.5, w: 0.6, h: 0.6 });
    slide.addImage({ data: beacon.logo.data }, { x: 4.0, y: 0.5, w: 1.6, h: 0.6 });

    const fileName = await pptx.writeFile({ fileName: join(workDir, 'product-icons.pptx') });
    bytes = await readFile(fileName);
  });

  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('writes a valid .pptx package with product SVGs embedded', () => {
    expect(bytes.subarray(0, 4)).toEqual(ZIP_MAGIC);
    expect(bytes.toString('latin1')).toContain('asvg:svgBlip');
  });

  it('embeds the atlas icon stroke color', () => {
    expect(bytes.toString('latin1')).toContain('stroke="#6366F1"');
  });

  it('embeds the beacon icon stroke color', () => {
    expect(bytes.toString('latin1')).toContain('stroke="#F59E0B"');
  });
});
