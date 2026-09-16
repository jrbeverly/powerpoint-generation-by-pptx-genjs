import { ICON_IDS, isKnownIconId } from '../catalog/icons.js';
import { isKnownProductId, PRODUCT_IDS } from '../catalog/products.js';
import {
  METRIC_DETAIL_CONSTRAINTS,
  NOTICE_CONSTRAINTS,
  PROJECT_STATUS_CONSTRAINTS,
  ROADMAP_CONSTRAINTS,
  THEMES_CONSTRAINTS,
} from '../constraints/archetypes.js';
import { parsePresentation } from '../schema/presentation.js';
import type { Presentation, PresentationDocument } from '../schema/presentation.js';

// ---------------------------------------------------------------------------
// Violation types
// ---------------------------------------------------------------------------

/**
 * A catalog reference that resolved to an unknown id.
 *
 * Message format (VISION §31):
 * ```
 * ERROR
 * Slide archetype: themes
 * Theme: Foundation
 *
 * Unknown icon id: "not-an-icon"
 * Expected one of: advisory, deprecation, ...
 * ```
 */
export interface CatalogViolation {
  kind: 'catalog';
  archetype: string;
  contextLines: ReadonlyArray<readonly [string, string]>;
  catalogName: string;
  unknownValue: string;
  expectedIds: ReadonlyArray<string>;
}

/**
 * A slide content value that exceeds an archetype's layout limit.
 *
 * Message format (VISION §31):
 * ```
 * ERROR
 * Slide archetype: project-status
 * Initiative: Workspace Assistant Rollout
 * Phase: Production Readiness
 *
 * Maximum epics: 5
 * Received: 9
 * ```
 */
export interface ConstraintViolation {
  kind: 'constraint';
  archetype: string;
  contextLines: ReadonlyArray<readonly [string, string]>;
  constraintLabel: string;
  limit: number;
  received: number;
}

export type ValidationViolation = CatalogViolation | ConstraintViolation;

// ---------------------------------------------------------------------------
// PresentationValidationError
// ---------------------------------------------------------------------------

function formatViolation(v: ValidationViolation): string {
  const lines: string[] = ['ERROR', `Slide archetype: ${v.archetype}`];
  for (const [label, value] of v.contextLines) {
    lines.push(`${label}: ${value}`);
  }
  lines.push('');
  if (v.kind === 'catalog') {
    lines.push(`Unknown ${v.catalogName}: "${v.unknownValue}"`);
    lines.push(`Expected one of: ${v.expectedIds.join(', ')}`);
  } else {
    lines.push(`${v.constraintLabel}: ${v.limit}`);
    lines.push(`Received: ${v.received}`);
  }
  return lines.join('\n');
}

/**
 * Thrown when one or more violations are found during presentation validation.
 *
 * All violations are collected before throwing so callers receive a complete
 * report rather than a single failure (VISION §31). Each violation block
 * follows the VISION §31 ERROR format and is separated by a blank line.
 */
export class PresentationValidationError extends Error {
  readonly violations: ReadonlyArray<ValidationViolation>;

  constructor(violations: ReadonlyArray<ValidationViolation>) {
    const count = violations.length;
    const header = `Presentation validation failed with ${count} violation${count === 1 ? '' : 's'}.`;
    const blocks = violations.map(formatViolation);
    super([header, ...blocks].join('\n\n'));
    this.name = 'PresentationValidationError';
    this.violations = violations;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Validates and parses a Presentation JSON document.
 *
 * Three-stage pipeline (VISION §42):
 * 1. **Structural**: Zod schema parse — rejects unknown fields, wrong types,
 *    invalid versions, and out-of-vocabulary metric/status/trend values.
 *    Throws `ZodError` immediately; structural errors block further checks.
 * 2. **Catalog references**: checks icon ids and product ids that the Zod
 *    schema accepts as free strings (VISION §8, §9, §39). Collects all
 *    unknown references before reporting.
 * 3. **Content constraints**: checks per-archetype layout limits (VISION §30).
 *    Collects all violations across all sections and items before reporting.
 *
 * Stages 2 and 3 are aggregated: every violation found in both stages is
 * reported together in a single `PresentationValidationError` rather than
 * stopping at the first failure.
 *
 * @throws {ZodError} When the document fails structural schema validation.
 * @throws {PresentationValidationError} When catalog references or content
 *   constraints are violated (one or more collected violations).
 */
export function validatePresentation(input: unknown): PresentationDocument {
  // Stage 1: structural schema validation (throws ZodError on failure)
  const doc = parsePresentation(input);

  const violations: ValidationViolation[] = [];

  // Stage 2: catalog reference validation (collect all)
  collectCatalogViolations(doc.presentation, violations);

  // Stage 3: content constraint validation (collect all)
  collectConstraintViolations(doc.presentation, violations);

  if (violations.length > 0) {
    throw new PresentationValidationError(violations);
  }

  return doc;
}

// ---------------------------------------------------------------------------
// Stage 2 — catalog reference validation
// ---------------------------------------------------------------------------

function pushCatalog(
  violations: ValidationViolation[],
  archetype: string,
  contextLines: ReadonlyArray<readonly [string, string]>,
  catalogName: string,
  unknownValue: string,
  expectedIds: ReadonlyArray<string>,
): void {
  violations.push({
    kind: 'catalog',
    archetype,
    contextLines,
    catalogName,
    unknownValue,
    expectedIds,
  });
}

function collectCatalogViolations(
  presentation: Presentation,
  violations: ValidationViolation[],
): void {
  // Presentation-level product (VISION §9)
  if (!isKnownProductId(presentation.product)) {
    pushCatalog(violations, 'presentation', [], 'product id', presentation.product, PRODUCT_IDS);
  }

  // Theme icons (VISION §13)
  for (const theme of presentation.themes) {
    if (!isKnownIconId(theme.icon)) {
      pushCatalog(violations, 'themes', [['Theme', theme.title]], 'icon id', theme.icon, ICON_IDS);
    }
  }

  // Project and phase icons (VISION §18)
  for (const project of presentation.projects) {
    if (!isKnownIconId(project.icon)) {
      pushCatalog(
        violations,
        'project-status',
        [['Initiative', project.title]],
        'icon id',
        project.icon,
        ICON_IDS,
      );
    }
    for (const phase of project.phases) {
      if (!isKnownIconId(phase.icon)) {
        pushCatalog(
          violations,
          'project-status',
          [
            ['Initiative', project.title],
            ['Phase', phase.title],
          ],
          'icon id',
          phase.icon,
          ICON_IDS,
        );
      }
    }
  }

  // Release product references — optional field (VISION §20)
  for (const release of presentation.releases) {
    if (release.product !== undefined && !isKnownProductId(release.product)) {
      pushCatalog(
        violations,
        'release',
        [['Release', release.title]],
        'product id',
        release.product,
        PRODUCT_IDS,
      );
    }
  }

  // Deprecation product references — optional field (VISION §21)
  for (const dep of presentation.deprecations) {
    if (dep.product !== undefined && !isKnownProductId(dep.product)) {
      pushCatalog(
        violations,
        'deprecation',
        [['Deprecation', dep.title]],
        'product id',
        dep.product,
        PRODUCT_IDS,
      );
    }
  }

  // Advisory product references — optional field (VISION §22)
  for (const advisory of presentation.advisories) {
    if (advisory.product !== undefined && !isKnownProductId(advisory.product)) {
      pushCatalog(
        violations,
        'advisory',
        [['Advisory', advisory.title]],
        'product id',
        advisory.product,
        PRODUCT_IDS,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Stage 3 — content constraint validation
// ---------------------------------------------------------------------------

function pushConstraint(
  violations: ValidationViolation[],
  archetype: string,
  contextLines: ReadonlyArray<readonly [string, string]>,
  constraintLabel: string,
  limit: number,
  received: number,
): void {
  violations.push({
    kind: 'constraint',
    archetype,
    contextLines,
    constraintLabel,
    limit,
    received,
  });
}

function collectConstraintViolations(
  presentation: Presentation,
  violations: ValidationViolation[],
): void {
  collectThemesConstraints(presentation, violations);
  collectMetricDetailConstraints(presentation, violations);
  collectProjectStatusConstraints(presentation, violations);
  collectNoticeConstraints('release', 'Release', presentation.releases, violations);
  collectNoticeConstraints('deprecation', 'Deprecation', presentation.deprecations, violations);
  collectNoticeConstraints('advisory', 'Advisory', presentation.advisories, violations);
  collectRoadmapConstraints(presentation, violations);
}

function collectThemesConstraints(
  presentation: Presentation,
  violations: ValidationViolation[],
): void {
  const { themes } = presentation;
  if (themes.length === 0) return; // section absent — no archetype rendered

  const c = THEMES_CONSTRAINTS;

  if (themes.length < c.count.min) {
    pushConstraint(violations, 'themes', [], 'Minimum themes', c.count.min, themes.length);
    return; // per-theme checks are meaningless when count is below minimum
  }
  if (themes.length > c.count.max) {
    pushConstraint(violations, 'themes', [], 'Maximum themes', c.count.max, themes.length);
    // Continue into per-theme checks — those violations are still actionable
  }

  for (const theme of themes) {
    if (theme.title.length > c.headingLength.max) {
      pushConstraint(
        violations,
        'themes',
        [['Theme', theme.title]],
        'Maximum heading length',
        c.headingLength.max,
        theme.title.length,
      );
    }
    if (theme.bullets.length > c.bulletsPerTheme.max) {
      pushConstraint(
        violations,
        'themes',
        [['Theme', theme.title]],
        'Maximum bullets per theme',
        c.bulletsPerTheme.max,
        theme.bullets.length,
      );
    }
    for (const bullet of theme.bullets) {
      if (bullet.length > c.bulletLength.max) {
        pushConstraint(
          violations,
          'themes',
          [['Theme', theme.title]],
          'Maximum bullet length',
          c.bulletLength.max,
          bullet.length,
        );
      }
    }
  }
}

function collectMetricDetailConstraints(
  presentation: Presentation,
  violations: ValidationViolation[],
): void {
  const c = METRIC_DETAIL_CONSTRAINTS;

  for (const entry of presentation.metrics) {
    const bullets = entry.bullets ?? [];
    if (bullets.length > c.bullets.max) {
      pushConstraint(
        violations,
        'metric-detail',
        [['Metric', entry.metric]],
        'Maximum supporting bullets',
        c.bullets.max,
        bullets.length,
      );
    }
  }
}

function collectProjectStatusConstraints(
  presentation: Presentation,
  violations: ValidationViolation[],
): void {
  const c = PROJECT_STATUS_CONSTRAINTS;

  for (const project of presentation.projects) {
    if (project.phases.length > c.phases.max) {
      pushConstraint(
        violations,
        'project-status',
        [['Initiative', project.title]],
        'Maximum phases',
        c.phases.max,
        project.phases.length,
      );
    }

    for (const phase of project.phases) {
      if (phase.epics.length > c.epicsPerPhase.max) {
        pushConstraint(
          violations,
          'project-status',
          [
            ['Initiative', project.title],
            ['Phase', phase.title],
          ],
          'Maximum epics',
          c.epicsPerPhase.max,
          phase.epics.length,
        );
      }

      for (const epic of phase.epics) {
        if (epic.title.length > c.epicTitleLength.max) {
          pushConstraint(
            violations,
            'project-status',
            [
              ['Initiative', project.title],
              ['Phase', phase.title],
            ],
            'Maximum epic title length',
            c.epicTitleLength.max,
            epic.title.length,
          );
        }
      }
    }
  }
}

function collectNoticeConstraints(
  archetype: string,
  contextLabel: string,
  items: ReadonlyArray<{ title: string; bullets?: string[] | undefined }>,
  violations: ValidationViolation[],
): void {
  const c = NOTICE_CONSTRAINTS;

  for (const item of items) {
    if (item.title.length > c.titleLength.max) {
      pushConstraint(
        violations,
        archetype,
        [[contextLabel, item.title]],
        'Maximum title length',
        c.titleLength.max,
        item.title.length,
      );
    }
    const bullets = item.bullets ?? [];
    if (bullets.length > c.bullets.max) {
      pushConstraint(
        violations,
        archetype,
        [[contextLabel, item.title]],
        'Maximum bullets',
        c.bullets.max,
        bullets.length,
      );
    }
  }
}

function collectRoadmapConstraints(
  presentation: Presentation,
  violations: ValidationViolation[],
): void {
  const c = ROADMAP_CONSTRAINTS;

  if (presentation.roadmap.length > c.items.max) {
    pushConstraint(
      violations,
      'roadmap',
      [],
      'Maximum roadmap items',
      c.items.max,
      presentation.roadmap.length,
    );
  }

  for (const item of presentation.roadmap) {
    if (item.title.length > c.itemTitleLength.max) {
      pushConstraint(
        violations,
        'roadmap',
        [['Item', item.title]],
        'Maximum item title length',
        c.itemTitleLength.max,
        item.title.length,
      );
    }
  }
}
