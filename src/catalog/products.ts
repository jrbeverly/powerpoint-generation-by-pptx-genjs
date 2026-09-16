import type { ProductTheme, RenderContext } from '../theme/context.js';

import { createDefaultContext } from '../theme/context.js';
import { ASSET_DATA_URIS } from './assets.generated.js';
import { resolveIcon } from './icons.js';

/**
 * Ids of the known product catalog (VISION §32: Atlas, Beacon, Nimbus, Orbit).
 *
 * The JSON references a product by id only. Visual identity (logo, icon,
 * accent) is resolved here rather than stored in the input document — no
 * coordinates, colors, or asset paths appear in the Presentation JSON.
 */
export const PRODUCT_IDS = ['atlas', 'beacon', 'nimbus', 'orbit'] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

const KNOWN_PRODUCT_IDS: ReadonlySet<string> = new Set<string>(PRODUCT_IDS);

/**
 * Whether `id` is a product the catalog can resolve. Validation layers use
 * this to surface unknown product ids as failures (VISION §31).
 */
export function isKnownProductId(id: string): id is ProductId {
  return KNOWN_PRODUCT_IDS.has(id);
}

function logoAsset(id: ProductId): { data: string } {
  const key = `products/${id}-logo`;
  const data = ASSET_DATA_URIS[key];
  if (data === undefined) {
    throw new Error(
      `Product logo "${id}" has no embedded asset for "${key}"; ` +
        `run "npm run generate:assets" to regenerate the catalog.`,
    );
  }
  return { data };
}

/**
 * The mock product catalog (VISION §9, §32).
 *
 * Each entry carries the icon and logo as render-ready data URIs so no
 * filesystem access is needed at render time. Accent colors match the SVG
 * stroke colors in `assets/products/` for visual continuity (VISION §40).
 *
 * Advisory + Atlas  =  this catalog entry  +  advisory archetype
 * Advisory + Beacon =  this catalog entry  +  advisory archetype
 *   (no per-product archetype code — VISION §9)
 */
const PRODUCT_CATALOG: Record<ProductId, ProductTheme> = {
  atlas: {
    id: 'atlas',
    icon: resolveIcon('atlas'),
    logo: logoAsset('atlas'),
    accent: '6366F1',
    secondaryAccent: '818CF8',
  },
  beacon: {
    id: 'beacon',
    icon: resolveIcon('beacon'),
    logo: logoAsset('beacon'),
    accent: 'F59E0B',
    secondaryAccent: 'FCD34D',
  },
  nimbus: {
    id: 'nimbus',
    icon: resolveIcon('nimbus'),
    logo: logoAsset('nimbus'),
    accent: '3B82F6',
    secondaryAccent: '93C5FD',
  },
  orbit: {
    id: 'orbit',
    icon: resolveIcon('orbit'),
    logo: logoAsset('orbit'),
    accent: '10B981',
    secondaryAccent: '6EE7B7',
  },
};

/**
 * Resolves a product id to its full visual theme.
 *
 * Fails loudly for unknown ids — never returns a default (VISION §31).
 * The same id always resolves to the same theme everywhere (VISION §40).
 */
export function resolveProductTheme(id: string): ProductTheme {
  if (!isKnownProductId(id)) {
    throw new Error(`Unknown product id "${id}". Expected one of: ${PRODUCT_IDS.join(', ')}.`);
  }
  return PRODUCT_CATALOG[id];
}

/**
 * Creates a `RenderContext` with the named product theme injected, ready to
 * pass to any archetype renderer. All base layout, typography, spacing, and
 * color constants are inherited from `createDefaultContext`.
 *
 * Any archetype + any product = this context + that archetype renderer.
 * No per-product archetype code needed (VISION §9).
 */
export function createContextForProduct(productId: string): RenderContext {
  return { ...createDefaultContext(), productTheme: resolveProductTheme(productId) };
}
