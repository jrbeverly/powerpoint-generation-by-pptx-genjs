import type pptxgen from 'pptxgenjs';

import type { Status } from '../schema/common.js';
import type { RenderContext } from '../theme/context.js';

import { addPrimaryIcon } from './icon.js';
import { addStatusIndicator } from './status-icon.js';

/**
 * Semantic content of the application-like header (VISION §10): what the
 * header says, never how it is drawn.
 */
export interface ApplicationHeaderContent {
  /** Primary icon id — the top-left "where am I?" icon (VISION §39). */
  icon: string;
  /** Initiative or slide title, shown next to the primary icon. */
  title: string;
  /** Optional category / location, joined after the title as "TITLE / LOCATION". */
  location?: string;
  /** Optional state indicator in the top-right (VISION §10, §39). */
  status?: Status;
}

/**
 * Options for `addProductIdentity`.
 */
export interface ProductIdentityOptions {
  /** Override the horizontal position; defaults to the header right zone. */
  x?: number;
  /** Override the vertical position; defaults to the header right zone. */
  y?: number;
  /**
   * Which asset to render: the wide `'logo'` lockup (default) or the square
   * `'icon'` mark. Both are read from the active `ProductTheme`.
   */
  variant?: 'logo' | 'icon';
}

/**
 * Renders the product identity (logo or icon) from the active `ProductTheme`
 * (VISION §9).
 *
 * The logo artwork carries the product accent color, and the header bar uses
 * `ProductTheme.accent`, so product identity is visual, not textual — no
 * per-product rendering code exists (VISION §9). When no product theme is
 * present in the context this is a no-op: slides without product identity
 * simply omit it.
 */
export function addProductIdentity(
  slide: pptxgen.Slide,
  ctx: RenderContext,
  options: ProductIdentityOptions = {},
): void {
  const { layout: L, productTheme } = ctx;
  if (productTheme === undefined) {
    return;
  }

  const H = L.header;
  const isLogo = (options.variant ?? 'logo') === 'logo';
  const asset = isLogo ? productTheme.logo : productTheme.icon;
  const w = isLogo ? H.productLogoW : H.stateIconSize;
  const h = isLogo ? H.productLogoH : H.stateIconSize;
  // Default placement: the header right zone, left of the state slot.
  const x = options.x ?? (isLogo ? H.stateRight - H.productLogoGap - H.productLogoW : H.stateRight);
  const y = options.y ?? (isLogo ? (H.height - H.productLogoH) / 2 : H.stateIconY);

  slide.addImage({ data: asset.data, x, y, w, h });
}

/**
 * Renders the recurring application-like title bar (VISION §10, §28):
 *
 * - top-left "where am I?": primary icon + title / location;
 * - top-right "what should I know about its state?": product identity +
 *   optional status indicator;
 * - a divider line marking the top of the content region.
 *
 * Every coordinate is read from `ctx.layout` (`Layout.header`, `Layout.slide`,
 * `Layout.content`) and every style value from `ctx.typography` / `ctx.colors`
 * / `ctx.productTheme`, so changing the header convention here changes it
 * everywhere (VISION §28, §29). The function is a pure function of its
 * arguments — repeated calls with the same inputs add the same shapes in the
 * same order (determinism, ADR-0006).
 */
export function addApplicationHeader(
  pptx: pptxgen,
  slide: pptxgen.Slide,
  ctx: RenderContext,
  content: ApplicationHeaderContent,
): void {
  const { layout: L, typography: T, spacing: S, colors: C, productTheme } = ctx;
  const H = L.header;
  // Product accent when a product theme is active, base accent otherwise.
  const accent = productTheme?.accent ?? C.accent;

  // Full-bleed header bar from the slide origin (VISION §10 title-bar motif).
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: L.slide.width,
    h: H.height,
    fill: { color: accent },
    line: { type: 'none' },
  });

  // Top-left: "where am I?"
  addPrimaryIcon(slide, ctx, content.icon);

  const titleRuns: pptxgen.TextProps[] = [{ text: content.title, options: { bold: true } }];
  if (content.location !== undefined) {
    titleRuns.push({
      text: ` / ${content.location}`,
      options: { bold: false, color: C.textSecondary },
    });
  }
  // The title may extend up to the start of the right zone, leaving a gutter.
  const rightZoneLeft =
    productTheme === undefined ? H.stateRight : H.stateRight - H.productLogoGap - H.productLogoW;
  slide.addText(titleRuns, {
    x: H.titleX,
    y: H.titleY,
    w: rightZoneLeft - H.titleX - S.md,
    h: H.titleHeight,
    fontFace: T.fontFamily,
    fontSize: T.scale.h4,
    color: C.textPrimary,
    valign: 'middle',
  });

  // Top-right: "what should I know about its state?"
  if (productTheme !== undefined) {
    addProductIdentity(slide, ctx);
  }
  if (content.status !== undefined) {
    addStatusIndicator(slide, ctx, content.status);
  }

  // Divider marking the top of the content region (VISION §10).
  slide.addShape(pptx.ShapeType.line, {
    x: L.content.left,
    y: L.content.top,
    w: L.content.right - L.content.left,
    h: 0,
    line: { color: accent, width: 1.5 },
  });
}
