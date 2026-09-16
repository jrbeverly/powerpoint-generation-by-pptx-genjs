import { addApplicationHeader } from '../components/index.js';
import { ROADMAP_CONSTRAINTS } from '../constraints/archetypes.js';
import { ROADMAP_HORIZONS, type RoadmapItem } from '../schema/presentation.js';

import type { ArchetypeRenderer } from './types.js';

const HORIZON_LABELS = { now: 'NOW', next: 'NEXT', later: 'LATER' } as const;

/**
 * Renders a deliberately minimal NOW / NEXT / LATER roadmap (VISION §23).
 * Items are grouped by horizon rather than positioned on a time axis: this is
 * a quick statement of expectations, explicitly not a Gantt chart.
 */
export const addRoadmapSlide: ArchetypeRenderer<readonly RoadmapItem[]> = (
  pptx,
  ctx,
  items,
): void => {
  const c = ROADMAP_CONSTRAINTS;
  if (items.length > c.items.max) {
    throw new Error(
      `addRoadmapSlide supports at most ${c.items.max} items, got ${items.length}. ` +
        'Trim the roadmap — overflow is an input validation problem (VISION §30).',
    );
  }
  for (const item of items) {
    if (item.title.length > c.itemTitleLength.max) {
      throw new Error(
        `addRoadmapSlide supports item titles up to ${c.itemTitleLength.max} characters, ` +
          `got ${item.title.length} for "${item.title}" (VISION §30).`,
      );
    }
  }

  const { layout: L, typography: T, spacing: S, colors: C, productTheme } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: C.backgroundDark };
  addApplicationHeader(pptx, slide, ctx, { icon: 'roadmap', title: 'COMING NEXT' });

  const contentWidth = L.content.right - L.content.left;
  const columnGap = S.xl;
  const columnWidth =
    (contentWidth - columnGap * (ROADMAP_HORIZONS.length - 1)) / ROADMAP_HORIZONS.length;
  const labelY = L.content.top + S.xl;
  const itemHeight = (T.scale.body / 72) * T.lineSpacing.loose;

  ROADMAP_HORIZONS.forEach((horizon, columnIndex) => {
    const x = L.content.left + columnIndex * (columnWidth + columnGap);
    slide.addText(HORIZON_LABELS[horizon], {
      x,
      y: labelY,
      w: columnWidth,
      h: (T.scale.h3 / 72) * T.lineSpacing.loose,
      fontFace: T.fontFamily,
      fontSize: T.scale.h3,
      bold: true,
      color: productTheme?.accent ?? C.accent,
    });

    let y = labelY + S.xl;
    for (const item of items.filter((entry) => entry.horizon === horizon)) {
      slide.addText(item.title, {
        x,
        y,
        w: columnWidth,
        h: itemHeight,
        fontFace: T.fontFamily,
        fontSize: T.scale.body,
        color: C.textSecondary,
        valign: 'top',
      });
      y += itemHeight + S.lg;
    }
  });
};
