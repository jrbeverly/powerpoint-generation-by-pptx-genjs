import { resolveIcon } from '../catalog/icons.js';
import { addApplicationHeader, addBulletGroup, addIcon } from '../components/index.js';
import { THEMES_CONSTRAINTS } from '../constraints/archetypes.js';
import type { Theme } from '../schema/presentation.js';

import type { ArchetypeRenderer } from './types.js';

/**
 * Renders the two or three ideas that characterize the sprint (VISION §13).
 * All constraints are checked before a slide is added, so direct callers fail
 * loudly without leaving a partial deck or shrinking typography.
 */
export const addThemesSlide: ArchetypeRenderer<readonly Theme[]> = (pptx, ctx, themes): void => {
  const c = THEMES_CONSTRAINTS;
  if (themes.length < c.count.min || themes.length > c.count.max) {
    throw new Error(
      `addThemesSlide supports ${c.count.min}–${c.count.max} themes, got ${themes.length}. ` +
        'Overflow is an input validation problem, not a typography problem (VISION §30).',
    );
  }
  for (const theme of themes) {
    if (theme.title.length > c.headingLength.max) {
      throw new Error(
        `addThemesSlide supports headings up to ${c.headingLength.max} characters, ` +
          `got ${theme.title.length} for "${theme.title}" (VISION §30).`,
      );
    }
    if (theme.bullets.length > c.bulletsPerTheme.max) {
      throw new Error(
        `addThemesSlide supports at most ${c.bulletsPerTheme.max} bullets per theme, ` +
          `got ${theme.bullets.length} for "${theme.title}" (VISION §30).`,
      );
    }
    for (const bullet of theme.bullets) {
      if (bullet.length > c.bulletLength.max) {
        throw new Error(
          `addThemesSlide supports bullets up to ${c.bulletLength.max} characters, ` +
            `got ${bullet.length} for "${theme.title}" (VISION §30).`,
        );
      }
    }
    resolveIcon(theme.icon);
  }

  const { layout: L, typography: T, spacing: S, colors: C, productTheme } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: C.backgroundDark };
  addApplicationHeader(pptx, slide, ctx, { icon: 'sprint', title: 'SPRINT THEMES' });

  const contentWidth = L.content.right - L.content.left;
  const columnGap = S.xl;
  const columnWidth = (contentWidth - columnGap * (themes.length - 1)) / themes.length;
  const iconSize = S.xxl;
  const iconY = L.content.top + S.xl;
  const headingY = iconY + iconSize + S.lg;
  const headingHeight = (T.scale.h2 / 72) * T.lineSpacing.loose;
  const bulletY = headingY + headingHeight + S.md;

  themes.forEach((theme, index) => {
    const x = L.content.left + index * (columnWidth + columnGap);
    addIcon(slide, theme.icon, { x: x + (columnWidth - iconSize) / 2, y: iconY, size: iconSize });
    slide.addText(theme.title, {
      x,
      y: headingY,
      w: columnWidth,
      h: headingHeight,
      fontFace: T.fontFamily,
      fontSize: T.scale.h2,
      bold: true,
      color: productTheme?.accent ?? C.accent,
      align: 'center',
      valign: 'middle',
    });
    addBulletGroup(slide, ctx, theme.bullets, { x, y: bulletY, width: columnWidth });
  });
};
