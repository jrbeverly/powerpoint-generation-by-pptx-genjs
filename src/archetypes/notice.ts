import type pptxgen from 'pptxgenjs';

import { addApplicationHeader, addBulletGroup } from '../components/index.js';
import { NOTICE_CONSTRAINTS } from '../constraints/archetypes.js';
import type { Status } from '../schema/common.js';
import type { RenderContext } from '../theme/context.js';

interface NoticeContent {
  title: string;
  bullets?: string[] | undefined;
}

interface NoticeOptions {
  archetype: 'release' | 'deprecation' | 'advisory';
  icon: 'release' | 'deprecation' | 'advisory';
  status?: Status | undefined;
  statusLine?: string | undefined;
}

/** Shared visual grammar for the three notice archetypes (VISION §20–§22). */
export function addNoticeSlide(
  pptx: pptxgen,
  ctx: RenderContext,
  content: NoticeContent,
  options: NoticeOptions,
): void {
  const bullets = content.bullets ?? [];
  const constraints = NOTICE_CONSTRAINTS;

  // Validate before adding a slide so a failed render cannot leave a partial deck.
  if (content.title.length > constraints.titleLength.max) {
    throw new Error(
      `${options.archetype} titles may contain at most ${constraints.titleLength.max} characters, ` +
        `got ${content.title.length} for "${content.title}" (VISION §30).`,
    );
  }
  if (bullets.length > constraints.bullets.max) {
    throw new Error(
      `${options.archetype} slides support at most ${constraints.bullets.max} bullets, ` +
        `got ${bullets.length} for "${content.title}" (VISION §30).`,
    );
  }

  const { layout: L, typography: T, spacing: S, colors: C } = ctx;
  const slide = pptx.addSlide();
  slide.background = { color: C.backgroundDark };

  addApplicationHeader(pptx, slide, ctx, {
    icon: options.icon,
    title: content.title,
    status: options.status,
  });

  let y = L.content.top + S.lg;
  if (options.statusLine !== undefined) {
    const statusLineHeight = (T.scale.h3 / 72) * T.lineSpacing.loose;
    slide.addText(options.statusLine, {
      x: L.content.left,
      y,
      w: L.content.right - L.content.left,
      h: statusLineHeight,
      fontFace: T.fontFamily,
      fontSize: T.scale.h3,
      bold: true,
      color: C.textSecondary,
      valign: 'top',
    });
    y += statusLineHeight + S.lg;
  }

  addBulletGroup(slide, ctx, bullets, {
    x: L.content.left + S.md,
    y,
    width: L.content.right - L.content.left - S.md,
  });
}
