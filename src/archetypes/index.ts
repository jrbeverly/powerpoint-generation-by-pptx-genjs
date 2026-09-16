/**
 * Slide archetypes (VISION §6, §27): deterministic renderers that expand
 * semantic presentation content into slides, assembled from the reusable
 * visual primitives in `src/components/` (VISION §28).
 *
 * Every archetype conforms to the shared {@link ArchetypeRenderer} contract:
 * one call per semantic content item, theme-derived geometry only, and loud
 * failure instead of shrinking or overflowing (VISION §29–§31).
 */
export type { ArchetypeRenderer } from './types.js';

export { addAdvisorySlide } from './advisory.js';
export { addDeprecationSlide } from './deprecation.js';
export { addMetricDetailSlide } from './metric-detail.js';
export { addMetricSelectedSlide, type MetricSelection } from './metric-selected.js';
export { addMetricsOverviewSlide } from './metrics-overview.js';
export { addProjectStatusSlide } from './project-status.js';
export { addReleaseSlide } from './release.js';
export { addRoadmapSlide } from './roadmap.js';
export { addThemesSlide } from './themes.js';
export { addTitleSlide, type SprintOverview } from './title.js';
export {
  addSprintSummarySlide,
  type SprintSummary,
  type SprintSummaryItem,
} from './sprint-summary.js';
