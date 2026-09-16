import { getMetricDefinition } from '../catalog/metrics.js';
import type { Presentation } from '../schema/presentation.js';
import {
  METRIC_DETAIL_CONSTRAINTS,
  NOTICE_CONSTRAINTS,
  PROJECT_STATUS_CONSTRAINTS,
  ROADMAP_CONSTRAINTS,
  THEMES_CONSTRAINTS,
} from './archetypes.js';

/**
 * Thrown when presentation content exceeds an archetype's layout limits.
 *
 * The message follows the format from VISION §31 so callers can surface it
 * verbatim as a generation failure report:
 *
 * ```
 * Slide archetype: project-status
 * Initiative: Workspace Assistant Rollout
 * Phase: Production Readiness
 *
 * Maximum epics: 5
 * Received: 9
 * ```
 */
export class ConstraintViolationError extends Error {
  readonly archetype: string;
  readonly contextLines: ReadonlyArray<readonly [string, string]>;
  readonly constraintLabel: string;
  readonly limit: number;
  readonly received: number;

  constructor(opts: {
    archetype: string;
    contextLines?: ReadonlyArray<readonly [string, string]>;
    constraintLabel: string;
    limit: number;
    received: number;
  }) {
    const lines: string[] = [`Slide archetype: ${opts.archetype}`];
    for (const [label, value] of opts.contextLines ?? []) {
      lines.push(`${label}: ${value}`);
    }
    lines.push('');
    lines.push(`${opts.constraintLabel}: ${opts.limit}`);
    lines.push(`Received: ${opts.received}`);
    super(lines.join('\n'));
    this.name = 'ConstraintViolationError';
    this.archetype = opts.archetype;
    this.contextLines = opts.contextLines ?? [];
    this.constraintLabel = opts.constraintLabel;
    this.limit = opts.limit;
    this.received = opts.received;
  }
}

function fail(opts: {
  archetype: string;
  contextLines?: ReadonlyArray<readonly [string, string]>;
  constraintLabel: string;
  limit: number;
  received: number;
}): never {
  throw new ConstraintViolationError(opts);
}

/**
 * Validates that the semantic presentation content satisfies all per-archetype
 * layout constraints (VISION §30, §31).
 *
 * Throws {@link ConstraintViolationError} on the first violation found.
 * Call this immediately after {@link parsePresentation} to form the complete
 * validation gate before any rendering begins:
 *
 * ```typescript
 * const doc = parsePresentation(json);
 * validateConstraints(doc.presentation);
 * ```
 *
 * **Overflow policy: fail loud (VISION §31).** The renderer must never shrink
 * fonts to accommodate excessive content — the input must be corrected instead.
 * Deterministic splitting (e.g. "Production Readiness (continued)") is deferred
 * to the composition milestone.
 */
export function validateConstraints(presentation: Presentation): void {
  validateThemes(presentation);
  validateMetrics(presentation);
  validateProjects(presentation);
  validateReleases(presentation);
  validateDeprecations(presentation);
  validateAdvisories(presentation);
  validateRoadmap(presentation);
}

function validateThemes(presentation: Presentation): void {
  const { themes } = presentation;
  if (themes.length === 0) return; // empty → section omitted, no archetype rendered

  const c = THEMES_CONSTRAINTS;

  if (themes.length < c.count.min) {
    fail({
      archetype: 'themes',
      constraintLabel: 'Minimum themes',
      limit: c.count.min,
      received: themes.length,
    });
  }
  if (themes.length > c.count.max) {
    fail({
      archetype: 'themes',
      constraintLabel: 'Maximum themes',
      limit: c.count.max,
      received: themes.length,
    });
  }

  for (const theme of themes) {
    if (theme.title.length > c.headingLength.max) {
      fail({
        archetype: 'themes',
        contextLines: [['Theme', theme.title]],
        constraintLabel: 'Maximum heading length',
        limit: c.headingLength.max,
        received: theme.title.length,
      });
    }
    if (theme.bullets.length > c.bulletsPerTheme.max) {
      fail({
        archetype: 'themes',
        contextLines: [['Theme', theme.title]],
        constraintLabel: 'Maximum bullets per theme',
        limit: c.bulletsPerTheme.max,
        received: theme.bullets.length,
      });
    }
    for (const bullet of theme.bullets) {
      if (bullet.length > c.bulletLength.max) {
        fail({
          archetype: 'themes',
          contextLines: [['Theme', theme.title]],
          constraintLabel: 'Maximum bullet length',
          limit: c.bulletLength.max,
          received: bullet.length,
        });
      }
    }
  }
}

function validateMetrics(presentation: Presentation): void {
  const c = METRIC_DETAIL_CONSTRAINTS;

  for (const entry of presentation.metrics) {
    // Every selected metric must resolve through the metric catalog
    // (VISION §14): the entry carries only an id and value, so labels, icons,
    // and formatting come from the catalog. Unknown ids fail loudly
    // (VISION §31); the schema already restricts ids to the catalog
    // vocabulary, so this call also guards against catalog/schema drift.
    getMetricDefinition(entry.metric);

    const bullets = entry.bullets ?? [];
    if (bullets.length > c.bullets.max) {
      fail({
        archetype: 'metric-detail',
        contextLines: [['Metric', entry.metric]],
        constraintLabel: 'Maximum supporting bullets',
        limit: c.bullets.max,
        received: bullets.length,
      });
    }
  }
}

function validateProjects(presentation: Presentation): void {
  const c = PROJECT_STATUS_CONSTRAINTS;

  for (const project of presentation.projects) {
    if (project.phases.length > c.phases.max) {
      fail({
        archetype: 'project-status',
        contextLines: [['Initiative', project.title]],
        constraintLabel: 'Maximum phases',
        limit: c.phases.max,
        received: project.phases.length,
      });
    }
    for (const phase of project.phases) {
      if (phase.epics.length > c.epicsPerPhase.max) {
        fail({
          archetype: 'project-status',
          contextLines: [
            ['Initiative', project.title],
            ['Phase', phase.title],
          ],
          constraintLabel: 'Maximum epics',
          limit: c.epicsPerPhase.max,
          received: phase.epics.length,
        });
      }
      for (const epic of phase.epics) {
        if (epic.title.length > c.epicTitleLength.max) {
          fail({
            archetype: 'project-status',
            contextLines: [
              ['Initiative', project.title],
              ['Phase', phase.title],
            ],
            constraintLabel: 'Maximum epic title length',
            limit: c.epicTitleLength.max,
            received: epic.title.length,
          });
        }
      }
    }
  }
}

function validateReleases(presentation: Presentation): void {
  const c = NOTICE_CONSTRAINTS;

  for (const release of presentation.releases) {
    if (release.title.length > c.titleLength.max) {
      fail({
        archetype: 'release',
        contextLines: [['Release', release.title]],
        constraintLabel: 'Maximum title length',
        limit: c.titleLength.max,
        received: release.title.length,
      });
    }
    const bullets = release.bullets ?? [];
    if (bullets.length > c.bullets.max) {
      fail({
        archetype: 'release',
        contextLines: [['Release', release.title]],
        constraintLabel: 'Maximum bullets',
        limit: c.bullets.max,
        received: bullets.length,
      });
    }
  }
}

function validateDeprecations(presentation: Presentation): void {
  const c = NOTICE_CONSTRAINTS;

  for (const dep of presentation.deprecations) {
    if (dep.title.length > c.titleLength.max) {
      fail({
        archetype: 'deprecation',
        contextLines: [['Deprecation', dep.title]],
        constraintLabel: 'Maximum title length',
        limit: c.titleLength.max,
        received: dep.title.length,
      });
    }
    const bullets = dep.bullets ?? [];
    if (bullets.length > c.bullets.max) {
      fail({
        archetype: 'deprecation',
        contextLines: [['Deprecation', dep.title]],
        constraintLabel: 'Maximum bullets',
        limit: c.bullets.max,
        received: bullets.length,
      });
    }
  }
}

function validateAdvisories(presentation: Presentation): void {
  const c = NOTICE_CONSTRAINTS;

  for (const advisory of presentation.advisories) {
    if (advisory.title.length > c.titleLength.max) {
      fail({
        archetype: 'advisory',
        contextLines: [['Advisory', advisory.title]],
        constraintLabel: 'Maximum title length',
        limit: c.titleLength.max,
        received: advisory.title.length,
      });
    }
    const bullets = advisory.bullets ?? [];
    if (bullets.length > c.bullets.max) {
      fail({
        archetype: 'advisory',
        contextLines: [['Advisory', advisory.title]],
        constraintLabel: 'Maximum bullets',
        limit: c.bullets.max,
        received: bullets.length,
      });
    }
  }
}

function validateRoadmap(presentation: Presentation): void {
  const c = ROADMAP_CONSTRAINTS;

  if (presentation.roadmap.length > c.items.max) {
    fail({
      archetype: 'roadmap',
      constraintLabel: 'Maximum roadmap items',
      limit: c.items.max,
      received: presentation.roadmap.length,
    });
  }
  for (const item of presentation.roadmap) {
    if (item.title.length > c.itemTitleLength.max) {
      fail({
        archetype: 'roadmap',
        contextLines: [['Item', item.title]],
        constraintLabel: 'Maximum item title length',
        limit: c.itemTitleLength.max,
        received: item.title.length,
      });
    }
  }
}
