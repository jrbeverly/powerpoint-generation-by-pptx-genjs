import type { Deprecation } from '../schema/presentation.js';

import { addNoticeSlide } from './notice.js';
import type { ArchetypeRenderer } from './types.js';

/** Renders one lifecycle notice using the globally stable deprecation icon (VISION §21). */
export const addDeprecationSlide: ArchetypeRenderer<Deprecation> = (
  pptx,
  ctx,
  deprecation,
): void => {
  addNoticeSlide(pptx, ctx, deprecation, {
    archetype: 'deprecation',
    icon: 'deprecation',
    status: deprecation.state,
    statusLine:
      deprecation.retirementDate === undefined
        ? undefined
        : `Retirement: ${deprecation.retirementDate}`,
  });
};
