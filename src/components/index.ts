/**
 * Reusable visual primitives (VISION §28).
 *
 * Archetypes assemble slides from these components so a convention lives in
 * exactly one place; changing a convention here changes it everywhere.
 */
export { addApplicationHeader, addProductIdentity } from './application-header.js';
export type { ApplicationHeaderContent, ProductIdentityOptions } from './application-header.js';

export { addIcon, addPrimaryIcon } from './icon.js';
export type { IconPlacement } from './icon.js';

export { addStatusIndicator } from './status-icon.js';
export type { StatusIndicatorPlacement } from './status-icon.js';

export { addBulletGroup, BULLET_GROUP_MAX_BULLETS } from './bullet-group.js';
export type { BulletGroupPlacement } from './bullet-group.js';

export { addMetric } from './metric.js';
export type { MetricContent, MetricOptions, MetricPlacement } from './metric.js';

export { addProgressBar } from './progress-bar.js';
export type {
  ProgressBarContent,
  ProgressBarEmphasis,
  ProgressBarPlacement,
} from './progress-bar.js';

export { addEpic, addPhase } from './epic.js';
export type { HierarchyPlacement } from './epic.js';
