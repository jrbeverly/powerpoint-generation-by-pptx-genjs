import type { Release } from '../schema/presentation.js';

import { addNoticeSlide } from './notice.js';
import type { ArchetypeRenderer } from './types.js';

/** Renders one newly delivered capability using the stable release grammar (VISION §20). */
export const addReleaseSlide: ArchetypeRenderer<Release> = (pptx, ctx, release): void => {
  addNoticeSlide(pptx, ctx, release, {
    archetype: 'release',
    icon: 'release',
    status: release.state,
    statusLine: release.status,
  });
};
