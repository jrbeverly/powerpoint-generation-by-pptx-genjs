import type { Presentation } from '../schema/presentation.js';

import { addIcon } from '../components/index.js';
import type { ArchetypeRenderer } from './types.js';

/** Semantic content used by the opening Sprint Overview slide (VISION §12). */
export type SprintOverview = Pick<Presentation, 'title' | 'subtitle' | 'dateRange'>;

/**
 * Renders the deliberately sparse orientation slide that opens a sprint deck
 * (VISION §12). Product identity is supplied exclusively by RenderContext;
 * the semantic input contains no artwork, colors, or placement instructions.
 */
export const addTitleSlide: ArchetypeRenderer<SprintOverview> = (pptx, ctx, overview): void => {
  const { layout: L, typography: T, spacing: S, colors: C, productTheme } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: productTheme?.backgroundTreatment?.color ?? C.backgroundDark };

  const iconSize = S.xxl * 2;
  const iconX = (L.slide.width - iconSize) / 2;
  const iconY = L.content.top;
  if (productTheme === undefined) {
    addIcon(slide, 'sprint', { x: iconX, y: iconY, size: iconSize });
  } else {
    slide.addImage({
      data: productTheme.icon.data,
      x: iconX,
      y: iconY,
      w: iconSize,
      h: iconSize,
    });
  }

  const titleY = iconY + iconSize + S.xl;
  const titleHeight = (T.scale.display / 72) * T.lineSpacing.loose;
  slide.addText(overview.title, {
    x: L.content.left,
    y: titleY,
    w: L.content.right - L.content.left,
    h: titleHeight,
    fontFace: T.fontFamily,
    fontSize: T.scale.display,
    bold: true,
    color: C.textPrimary,
    align: 'center',
    valign: 'middle',
  });

  let contextY = titleY + titleHeight + S.md;
  const contextHeight = (T.scale.h3 / 72) * T.lineSpacing.loose;
  if (overview.subtitle !== undefined) {
    slide.addText(overview.subtitle, {
      x: L.content.left,
      y: contextY,
      w: L.content.right - L.content.left,
      h: contextHeight,
      fontFace: T.fontFamily,
      fontSize: T.scale.h3,
      color: C.textSecondary,
      align: 'center',
      valign: 'middle',
    });
    contextY += contextHeight + S.sm;
  }

  if (overview.dateRange !== undefined) {
    slide.addText(overview.dateRange, {
      x: L.content.left,
      y: contextY,
      w: L.content.right - L.content.left,
      h: contextHeight,
      fontFace: T.fontFamily,
      fontSize: T.scale.h4,
      color: C.textMuted,
      align: 'center',
      valign: 'middle',
    });
  }
};
