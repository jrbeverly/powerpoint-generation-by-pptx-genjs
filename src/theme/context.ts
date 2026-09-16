import type { BaseColors } from './colors.js';
import type { SlideLayout } from './layout.js';
import type { SpacingScale } from './spacing.js';
import type { TypographyConfig } from './typography.js';

import { Colors } from './colors.js';
import { Layout } from './layout.js';
import { Spacing } from './spacing.js';
import { Typography } from './typography.js';

/** A render-ready embedded asset, passed to `pptxgenjs` `addImage({ data })`. */
export interface Asset {
  data: string;
}

/**
 * Optional subtle background accent for product-themed slides (VISION §9).
 * Components may use this to apply a low-opacity tint or accent stripe.
 */
export interface BackgroundTreatment {
  /** Hex color without `#`, applied as a subtle background accent. */
  color: string;
}

/**
 * Per-product visual identity layered on top of the base palette (VISION §9).
 * Archetypes apply the product theme to inject brand color and identity;
 * there is no per-product archetype code — only per-product theme data.
 */
export interface ProductTheme {
  id: string;
  /** Product icon: placed in the application-like header (VISION §10, §39). */
  icon: Asset;
  /** Product logo: wordmark or lockup placed in the header right zone. */
  logo: Asset;
  /** Primary brand accent; hex without `#`, matches PptxGenJS HexColor. */
  accent: string;
  secondaryAccent?: string;
  backgroundTreatment?: BackgroundTreatment;
}

/**
 * Passed to every archetype renderer so that layout, typography, spacing,
 * and color decisions are derived from named constants rather than inline
 * literals. Archetypes receive RenderContext and must not use numeric
 * literals for coordinates, font sizes, or colors.
 *
 * productTheme is optional: when absent the base accent color is used.
 */
export interface RenderContext {
  layout: SlideLayout;
  typography: TypographyConfig;
  spacing: SpacingScale;
  colors: BaseColors;
  productTheme?: ProductTheme;
}

export function createDefaultContext(): RenderContext {
  return { layout: Layout, typography: Typography, spacing: Spacing, colors: Colors };
}
