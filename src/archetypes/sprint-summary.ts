import { addApplicationHeader, addIcon, addStatusIndicator } from '../components/index.js';
import { SPRINT_SUMMARY_CONSTRAINTS } from '../constraints/archetypes.js';
import type { Status } from '../schema/common.js';

import type { ArchetypeRenderer } from './types.js';

export interface SprintSummaryItem {
  /** An icon id already used for the same concept earlier in the deck. */
  icon: string;
  text: string;
}

/** Semantic content for the concise closing slide (VISION §24, §40). */
export interface SprintSummary {
  sprint: string;
  keyAccomplishment: SprintSummaryItem;
  overallState: { status: Status; text: string };
  majorUpcomingItem: SprintSummaryItem;
}

/** Renders the useful visual endpoint of a sprint deck; no Questions slide is added. */
export const addSprintSummarySlide: ArchetypeRenderer<SprintSummary> = (
  pptx,
  ctx,
  summary,
): void => {
  const maxLength = SPRINT_SUMMARY_CONSTRAINTS.itemTextLength.max;
  const statements = [
    summary.keyAccomplishment.text,
    summary.overallState.text,
    summary.majorUpcomingItem.text,
  ];
  for (const statement of statements) {
    if (statement.length > maxLength) {
      throw new Error(
        `addSprintSummarySlide supports statements up to ${maxLength} characters, ` +
          `got ${statement.length} for "${statement}" (VISION §30).`,
      );
    }
  }

  const { layout: L, typography: T, spacing: S, colors: C } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: C.backgroundDark };
  addApplicationHeader(pptx, slide, ctx, { icon: 'summary', title: summary.sprint });

  const iconSize = L.header.stateIconSize;
  const textX = L.content.left + iconSize + S.lg;
  const textWidth = L.content.right - textX;
  const rowHeight = (T.scale.h3 / 72) * T.lineSpacing.loose;
  const rowStep = rowHeight + S.xl;
  let y = L.content.top + S.xl;

  const addRow = (item: SprintSummaryItem): void => {
    addIcon(slide, item.icon, { x: L.content.left, y, size: iconSize });
    slide.addText(item.text, {
      x: textX,
      y,
      w: textWidth,
      h: rowHeight,
      fontFace: T.fontFamily,
      fontSize: T.scale.h3,
      color: C.textPrimary,
      valign: 'middle',
    });
    y += rowStep;
  };

  addRow(summary.keyAccomplishment);
  addStatusIndicator(slide, ctx, summary.overallState.status, { x: L.content.left, y });
  slide.addText(summary.overallState.text, {
    x: textX,
    y,
    w: textWidth,
    h: rowHeight,
    fontFace: T.fontFamily,
    fontSize: T.scale.h3,
    color: C.textPrimary,
    valign: 'middle',
  });
  y += rowStep;
  addRow(summary.majorUpcomingItem);
};
