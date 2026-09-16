import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import pptxgen from 'pptxgenjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ICON_CATEGORIES,
  ICON_IDS,
  isKnownIconId,
  resolveIcon,
  type IconCategory,
} from '../src/catalog/icons.js';
import { STATUS_VALUES } from '../src/schema/common.js';
import { METRIC_IDS } from '../src/schema/metrics.js';

/** Local file header signature of a ZIP archive ("PK\x03\x04"). */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

const SVG_DATA_URI_PREFIX = 'data:image/svg+xml;base64,';

/** The committed mock asset tree (VISION §8). */
const ASSETS_DIR = fileURLToPath(new URL('../assets', import.meta.url));

/**
 * The vision's icon vocabulary per category (VISION §8, §14, §32). Metric and
 * status ids mirror the schema vocabularies, so they must match exactly.
 */
const EXPECTED_IDS: Record<IconCategory, readonly string[]> = {
  archetypes: ['advisory', 'deprecation', 'release', 'roadmap', 'project', 'sprint', 'summary'],
  metrics: [...METRIC_IDS],
  status: [...STATUS_VALUES],
  products: ['atlas', 'beacon', 'nimbus', 'orbit'],
  common: ['epic', 'milestone', 'phase', 'arrow'],
};

const ALL_EXPECTED_IDS = ICON_CATEGORIES.flatMap((category) => EXPECTED_IDS[category]);

/** Decodes a catalog data URI back to its SVG source document. */
function decodeSvg(data: string): string {
  expect(data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
  return Buffer.from(data.slice(SVG_DATA_URI_PREFIX.length), 'base64').toString('utf8');
}

describe('icon catalog', () => {
  it('is closed over the vision vocabulary (VISION §8, §14, §32)', () => {
    expect([...ICON_IDS]).toEqual(ALL_EXPECTED_IDS);
    // Visual continuity requires one asset per semantic id (VISION §40).
    expect(new Set(ICON_IDS).size).toBe(ICON_IDS.length);
  });

  it('resolves every archetype, status, and common icon referenced by the vision', () => {
    for (const category of ['archetypes', 'status', 'common'] as const) {
      for (const id of EXPECTED_IDS[category]) {
        const icon = resolveIcon(id);
        expect(icon.id).toBe(id);
        expect(icon.data.startsWith(SVG_DATA_URI_PREFIX)).toBe(true);
      }
    }
  });

  it('resolves the schema metric catalog and mock product ids', () => {
    for (const category of ['metrics', 'products'] as const) {
      for (const id of EXPECTED_IDS[category]) {
        expect(resolveIcon(id).data).toMatch(/^data:image\/svg\+xml;base64,/);
      }
    }
    expect(isKnownIconId('delivery-confidence')).toBe(true);
    expect(isKnownIconId('atlas')).toBe(true);
  });

  it('throws loudly for unknown icon ids and never renders a placeholder (VISION §31)', () => {
    for (const unknown of ['', 'unknown-icon', 'foundation', 'icon.svg', 'STATUS']) {
      expect(() => resolveIcon(unknown)).toThrow(`Unknown icon id "${unknown}"`);
      expect(isKnownIconId(unknown)).toBe(false);
    }
  });

  it('resolves the same id to the same asset everywhere (VISION §40)', () => {
    for (const id of ICON_IDS) {
      expect(resolveIcon(id).data).toBe(resolveIcon(id).data);
    }
    // And distinct semantic ids resolve to distinct assets.
    const resolved = new Set(ICON_IDS.map((id) => resolveIcon(id).data));
    expect(resolved.size).toBe(ICON_IDS.length);
  });

  it('embeds the committed mock assets byte-for-byte (no drift)', async () => {
    for (const category of ICON_CATEGORIES) {
      for (const id of EXPECTED_IDS[category]) {
        const embedded = decodeSvg(resolveIcon(id).data);
        const committed = await readFile(join(ASSETS_DIR, category, `${id}.svg`), 'utf8');
        expect(embedded).toBe(committed);
      }
    }
  });
});

describe('icon catalog smoke test on a slide', () => {
  let workDir: string;
  let bytes: Buffer;

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'pptx-icons-'));
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';

    const slide = pptx.addSlide();
    slide.background = { color: '1F2937' };

    // One archetype, one status, and one product icon — the visual grammar
    // of the application-like header (VISION §10, §39).
    slide.addImage({ data: resolveIcon('release').data }, { x: 0.5, y: 0.5, w: 0.6, h: 0.6 });
    slide.addImage({ data: resolveIcon('healthy').data }, { x: 1.3, y: 0.5, w: 0.6, h: 0.6 });
    slide.addImage({ data: resolveIcon('atlas').data }, { x: 2.1, y: 0.5, w: 0.6, h: 0.6 });

    const fileName = await pptx.writeFile({ fileName: join(workDir, 'icons.pptx') });
    bytes = await readFile(fileName);
  });

  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('writes a valid .pptx package with the embedded SVG icons', () => {
    const listing = bytes.toString('latin1');

    expect(bytes.subarray(0, 4)).toEqual(ZIP_MAGIC);
    expect(listing).toContain('ppt/media/');
    expect(listing).toContain('.svg');
    expect(listing).toContain('image/svg+xml');
  });

  it('references the icons as PowerPoint SVG blips', () => {
    const listing = bytes.toString('latin1');

    // PptxGenJS writes the PowerPoint 2016+ SVG extension element; the raw
    // SVG sources are stored verbatim as media parts.
    expect(listing).toContain('asvg:svgBlip');
    expect(listing).toContain('<svg xmlns');
  });

  it('embeds the actual mock icon artwork, not placeholders', () => {
    const listing = bytes.toString('latin1');

    // Semantic status color of status/healthy and the atlas product accent.
    expect(listing).toContain('stroke="#10B981"');
    expect(listing).toContain('stroke="#6366F1"');
  });

  it('renders exactly one slide', () => {
    const listing = bytes.toString('latin1');
    expect(listing).not.toContain('ppt/slides/slide2.xml');
  });
});
