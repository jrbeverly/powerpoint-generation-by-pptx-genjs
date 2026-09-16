import type { Advisory } from '../schema/presentation.js';

import { addNoticeSlide } from './notice.js';
import type { ArchetypeRenderer } from './types.js';

/** Renders one awareness or action item using stable advisory iconography (VISION §22). */
export const addAdvisorySlide: ArchetypeRenderer<Advisory> = (pptx, ctx, advisory): void => {
  addNoticeSlide(pptx, ctx, advisory, {
    archetype: 'advisory',
    icon: 'advisory',
    statusLine: advisory.action,
  });
};
