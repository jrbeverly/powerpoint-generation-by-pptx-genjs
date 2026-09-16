import { STATUS_VALUES } from '../schema/common.js';
import { METRIC_IDS } from '../schema/metrics.js';
import { ASSET_DATA_URIS } from './assets.generated.js';

/**
 * The icon catalog: the controlled mapping from semantic icon ids to
 * concrete assets (VISION §7, §8, §39).
 *
 * Icons are a primary information channel, not decoration. Every id here is
 * a stable semantic concept; rendering code resolves ids through this
 * catalog instead of naming asset files, so the same id always produces the
 * same asset (visual continuity, VISION §40) and unknown ids fail loudly
 * instead of silently rendering a placeholder (VISION §31).
 *
 * The asset bytes live in `assets/` and are embedded as `image/svg+xml`
 * base64 data URIs at build time via `scripts/generate-assets.mjs` (see
 * docs/architecture-decisions/0003). The catalog itself never touches the
 * filesystem at render time.
 */

/** The controlled asset categories of the library (VISION §8). */
export const ICON_CATEGORIES = ['archetypes', 'metrics', 'status', 'products', 'common'] as const;
export type IconCategory = (typeof ICON_CATEGORIES)[number];

/** Archetype icons: what kind of content a slide carries (VISION §8, §39). */
const ARCHETYPE_ICON_IDS = [
  'advisory',
  'deprecation',
  'release',
  'roadmap',
  'project',
  'sprint',
  'summary',
] as const;

/** Mock product icons (VISION §32: Atlas, Beacon, Nimbus, Orbit). */
const PRODUCT_ICON_IDS = ['atlas', 'beacon', 'nimbus', 'orbit'] as const;

/** Common building-block icons: epic, milestone, phase, arrow (VISION §8). */
const COMMON_ICON_IDS = ['epic', 'milestone', 'phase', 'arrow'] as const;

/**
 * Every icon id the catalog can resolve, as a closed union.
 *
 * Metric and status ids are derived from the schema vocabularies
 * (`METRIC_IDS`, `STATUS_VALUES`) so the schema and the catalog cannot
 * drift apart; the remaining ids mirror the asset tree.
 */
export const ICON_IDS = [
  ...ARCHETYPE_ICON_IDS,
  ...METRIC_IDS,
  ...STATUS_VALUES,
  ...PRODUCT_ICON_IDS,
  ...COMMON_ICON_IDS,
] as const;
export type IconId = (typeof ICON_IDS)[number];

/** Which asset category holds each semantic id. */
const CATEGORY_BY_ID: Record<IconId, IconCategory> = {
  advisory: 'archetypes',
  deprecation: 'archetypes',
  release: 'archetypes',
  roadmap: 'archetypes',
  project: 'archetypes',
  sprint: 'archetypes',
  summary: 'archetypes',

  'delivery-confidence': 'metrics',
  throughput: 'metrics',
  quality: 'metrics',
  reliability: 'metrics',
  adoption: 'metrics',
  velocity: 'metrics',
  'operational-health': 'metrics',
  'customer-impact': 'metrics',

  healthy: 'status',
  attention: 'status',
  blocked: 'status',
  complete: 'status',
  upcoming: 'status',

  atlas: 'products',
  beacon: 'products',
  nimbus: 'products',
  orbit: 'products',

  epic: 'common',
  milestone: 'common',
  phase: 'common',
  arrow: 'common',
};

const KNOWN_ICON_IDS: ReadonlySet<string> = new Set<string>(ICON_IDS);

/**
 * Whether `id` is an icon the catalog can resolve. Validation layers use
 * this to surface unknown icon ids as validation failures (VISION §31).
 */
export function isKnownIconId(id: string): id is IconId {
  return KNOWN_ICON_IDS.has(id);
}

/** A catalog asset that is ready to be placed on a slide. */
export interface ResolvedIcon {
  /** The semantic id that was resolved (VISION §39). */
  id: IconId;
  /**
   * Render-ready `image/svg+xml;base64,` data URI for
   * `pptxgenjs` `addImage({ data })`.
   */
  data: string;
}

/**
 * Resolves a semantic icon id to its render-ready asset.
 *
 * Fails loudly for unknown ids — never returns a placeholder (VISION §31).
 * Resolution is a pure lookup over a static map, so the same id always
 * resolves to the same asset everywhere (VISION §40).
 */
export function resolveIcon(id: string): ResolvedIcon {
  if (!isKnownIconId(id)) {
    throw new Error(
      `Unknown icon id "${id}". Expected one of the catalog ids: ${ICON_IDS.join(', ')}.`,
    );
  }

  const key = `${CATEGORY_BY_ID[id]}/${id}`;
  const data = ASSET_DATA_URIS[key];
  if (data === undefined) {
    throw new Error(
      `Icon "${id}" has no embedded asset for "${key}"; the generated catalog is out of sync with assets/. Run "npm run generate:assets".`,
    );
  }
  return { id, data };
}
