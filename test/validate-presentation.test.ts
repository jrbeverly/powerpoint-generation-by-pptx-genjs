import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ICON_IDS } from '../src/catalog/icons.js';
import { PRODUCT_IDS } from '../src/catalog/products.js';
import {
  METRIC_DETAIL_CONSTRAINTS,
  NOTICE_CONSTRAINTS,
  PROJECT_STATUS_CONSTRAINTS,
  ROADMAP_CONSTRAINTS,
  THEMES_CONSTRAINTS,
} from '../src/constraints/archetypes.js';
import type {
  CatalogViolation,
  ConstraintViolation,
} from '../src/validation/validate-presentation.js';
import {
  PresentationValidationError,
  validatePresentation,
} from '../src/validation/validate-presentation.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a valid presentation JSON document shell with optional field overrides. */
function buildDocument(presentationOverrides: Record<string, unknown> = {}): unknown {
  return {
    version: '1.0',
    presentation: {
      title: 'Sprint 1 Overview',
      sprint: 'Sprint 1',
      product: 'atlas', // known catalog product
      themes: [],
      metrics: [],
      projects: [],
      releases: [],
      deprecations: [],
      advisories: [],
      roadmap: [],
      ...presentationOverrides,
    },
  };
}

/**
 * Asserts that `validatePresentation` throws `PresentationValidationError` and
 * that the first violation matches `expected`.
 */
function assertFirstViolation(
  input: unknown,
  expected: Partial<CatalogViolation | ConstraintViolation>,
) {
  try {
    validatePresentation(input);
    expect.unreachable('expected PresentationValidationError to be thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(PresentationValidationError);
    const e = err as PresentationValidationError;
    expect(e.violations.length).toBeGreaterThan(0);
    const first = e.violations[0];
    for (const [key, value] of Object.entries(expected)) {
      expect(first).toHaveProperty(key, value);
    }
  }
}

// ---------------------------------------------------------------------------
// Valid samples — must pass without throwing
// ---------------------------------------------------------------------------

describe('validatePresentation — valid presentations pass', () => {
  it('passes a minimal presentation (all sections empty, known product)', () => {
    expect(() => validatePresentation(buildDocument())).not.toThrow();
  });

  it('passes when no themes are supplied (section omitted)', () => {
    expect(() => validatePresentation(buildDocument({ themes: [] }))).not.toThrow();
  });

  it('passes with two or three themes using catalog icon ids', () => {
    expect(() =>
      validatePresentation(
        buildDocument({
          themes: [
            { icon: 'advisory', title: 'Foundation', bullets: ['Complete migration'] },
            { icon: 'release', title: 'Adoption', bullets: ['Expand pilot population'] },
          ],
        }),
      ),
    ).not.toThrow();

    expect(() =>
      validatePresentation(
        buildDocument({
          themes: [
            { icon: 'advisory', title: 'Foundation', bullets: [] },
            { icon: 'release', title: 'Adoption', bullets: [] },
            { icon: 'roadmap', title: 'Reliability', bullets: [] },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('passes with a project using catalog icon ids for project and phases', () => {
    expect(() =>
      validatePresentation(
        buildDocument({
          projects: [
            {
              id: 'workspace-assistant',
              title: 'Workspace Initiative',
              icon: 'project',
              status: 'on-track',
              phases: [
                {
                  title: 'Pilot Expansion',
                  icon: 'phase',
                  epics: [{ title: 'Expand pilot population' }, { title: 'Establish telemetry' }],
                },
              ],
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('passes with all four known products', () => {
    for (const product of PRODUCT_IDS) {
      expect(() => validatePresentation(buildDocument({ product }))).not.toThrow();
    }
  });

  it('passes with notice items using known product ids', () => {
    expect(() =>
      validatePresentation(
        buildDocument({
          releases: [{ product: 'atlas', title: 'New Feature', bullets: ['Released'] }],
          deprecations: [
            {
              product: 'beacon',
              title: 'Legacy API',
              retirementDate: 'October 31',
              bullets: ['Migrate to v2'],
            },
          ],
          advisories: [
            {
              product: 'nimbus',
              title: 'Auth Change',
              action: 'Action required',
              bullets: ['Update tokens'],
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('passes with all known metric ids', () => {
    expect(() =>
      validatePresentation(
        buildDocument({
          metrics: [
            { metric: 'delivery-confidence', value: 92, trend: 'up', status: 'healthy' },
            { metric: 'quality', value: 87, trend: 'flat', status: 'healthy' },
            { metric: 'adoption', value: 64, trend: 'up', status: 'attention' },
            { metric: 'operational-health', value: 96, trend: 'up', status: 'healthy' },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('passes with a full valid roadmap', () => {
    expect(() =>
      validatePresentation(
        buildDocument({
          roadmap: [
            { horizon: 'now', title: 'Improve pilot telemetry' },
            { horizon: 'next', title: 'Expand availability' },
            { horizon: 'later', title: 'Introduce automated governance controls' },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('returns the parsed PresentationDocument on success', () => {
    const doc = validatePresentation(buildDocument({ subtitle: 'Platform Engineering' }));
    expect(doc.version).toBe('1.0');
    expect(doc.presentation.title).toBe('Sprint 1 Overview');
    expect(doc.presentation.subtitle).toBe('Platform Engineering');
  });
});

// ---------------------------------------------------------------------------
// Stage 1 — structural schema errors (ZodError)
// ---------------------------------------------------------------------------

describe('validatePresentation — structural schema errors (Stage 1)', () => {
  it('throws ZodError for an unknown schema version', () => {
    const input = { ...(buildDocument() as Record<string, unknown>), version: '9.0' };
    expect(() => validatePresentation(input)).toThrow(z.ZodError);
  });

  it('throws ZodError for a missing required field', () => {
    const input = buildDocument() as Record<string, unknown>;
    delete input.version;
    expect(() => validatePresentation(input)).toThrow(z.ZodError);
  });

  it('throws ZodError for an unknown metric id (schema-level vocabulary enforcement)', () => {
    expect(() =>
      validatePresentation(
        buildDocument({ metrics: [{ metric: 'not-a-metric', value: 50, status: 'healthy' }] }),
      ),
    ).toThrow(z.ZodError);
  });

  it('throws ZodError for an invalid status value', () => {
    expect(() =>
      validatePresentation(
        buildDocument({ metrics: [{ metric: 'adoption', value: 64, status: 'ok' }] }),
      ),
    ).toThrow(z.ZodError);
  });

  it('throws ZodError for unknown fields (strict schema)', () => {
    expect(() =>
      validatePresentation(
        buildDocument({
          metrics: [{ metric: 'adoption', value: 64, status: 'healthy', iconX: 0.45 }],
        }),
      ),
    ).toThrow(z.ZodError);
  });

  it('does NOT throw PresentationValidationError for structural failures', () => {
    try {
      validatePresentation({ version: '1.0' });
    } catch (err) {
      expect(err).not.toBeInstanceOf(PresentationValidationError);
      expect(err).toBeInstanceOf(z.ZodError);
    }
  });
});

// ---------------------------------------------------------------------------
// Stage 2 — catalog reference violations
// ---------------------------------------------------------------------------

describe('validatePresentation — unknown product id (Stage 2)', () => {
  it('rejects an unknown presentation-level product id', () => {
    assertFirstViolation(buildDocument({ product: 'not-a-product' }), {
      kind: 'catalog',
      archetype: 'presentation',
      contextLines: [],
      catalogName: 'product id',
      unknownValue: 'not-a-product',
      expectedIds: PRODUCT_IDS,
    } satisfies CatalogViolation);
  });

  it('rejects an unknown product id in a release', () => {
    assertFirstViolation(
      buildDocument({ releases: [{ title: 'New Feature', product: 'unknown-product' }] }),
      {
        kind: 'catalog',
        archetype: 'release',
        contextLines: [['Release', 'New Feature']],
        catalogName: 'product id',
        unknownValue: 'unknown-product',
      },
    );
  });

  it('rejects an unknown product id in a deprecation', () => {
    assertFirstViolation(
      buildDocument({ deprecations: [{ title: 'Legacy API', product: 'not-real' }] }),
      {
        kind: 'catalog',
        archetype: 'deprecation',
        catalogName: 'product id',
        unknownValue: 'not-real',
      },
    );
  });

  it('rejects an unknown product id in an advisory', () => {
    assertFirstViolation(
      buildDocument({ advisories: [{ title: 'Auth Change', product: 'invalid' }] }),
      {
        kind: 'catalog',
        archetype: 'advisory',
        catalogName: 'product id',
        unknownValue: 'invalid',
      },
    );
  });

  it('accepts notices where the optional product field is absent', () => {
    expect(() =>
      validatePresentation(
        buildDocument({
          releases: [{ title: 'New Feature' }],
          deprecations: [{ title: 'Legacy API' }],
          advisories: [{ title: 'Auth Change' }],
        }),
      ),
    ).not.toThrow();
  });
});

describe('validatePresentation — unknown icon id (Stage 2)', () => {
  it('rejects an unknown icon id in a theme', () => {
    assertFirstViolation(
      buildDocument({
        themes: [
          { icon: 'advisory', title: 'Alpha', bullets: [] },
          { icon: 'not-an-icon', title: 'Beta', bullets: [] },
        ],
      }),
      {
        kind: 'catalog',
        archetype: 'themes',
        contextLines: [['Theme', 'Beta']],
        catalogName: 'icon id',
        unknownValue: 'not-an-icon',
        expectedIds: ICON_IDS,
      } satisfies CatalogViolation,
    );
  });

  it('rejects an unknown icon id in a project', () => {
    assertFirstViolation(
      buildDocument({
        projects: [
          {
            id: 'p1',
            title: 'Workspace Initiative',
            icon: 'assistant-fake',
            status: 'on-track',
            phases: [],
          },
        ],
      }),
      {
        kind: 'catalog',
        archetype: 'project-status',
        contextLines: [['Initiative', 'Workspace Initiative']],
        catalogName: 'icon id',
        unknownValue: 'assistant-fake',
      },
    );
  });

  it('rejects an unknown icon id in a phase', () => {
    assertFirstViolation(
      buildDocument({
        projects: [
          {
            id: 'p1',
            title: 'Workspace Initiative',
            icon: 'project', // valid project icon
            status: 'on-track',
            phases: [
              {
                title: 'Pilot Expansion',
                icon: 'pilot-fake',
                epics: [],
              },
            ],
          },
        ],
      }),
      {
        kind: 'catalog',
        archetype: 'project-status',
        contextLines: [
          ['Initiative', 'Workspace Initiative'],
          ['Phase', 'Pilot Expansion'],
        ],
        catalogName: 'icon id',
        unknownValue: 'pilot-fake',
      },
    );
  });

  it('accepts all known archetype and common icon ids', () => {
    for (const iconId of [
      'advisory',
      'deprecation',
      'release',
      'roadmap',
      'project',
      'sprint',
      'summary',
      'phase',
      'epic',
    ] as const) {
      expect(() =>
        validatePresentation(
          buildDocument({
            themes: [
              { icon: iconId, title: 'Alpha', bullets: [] },
              { icon: 'advisory', title: 'Beta', bullets: [] },
            ],
          }),
        ),
      ).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// Stage 3 — content constraint violations
// ---------------------------------------------------------------------------

describe('validatePresentation — themes constraint violations (Stage 3)', () => {
  it('rejects 1 theme (below minimum)', () => {
    assertFirstViolation(
      buildDocument({ themes: [{ icon: 'advisory', title: 'Solo', bullets: [] }] }),
      {
        kind: 'constraint',
        archetype: 'themes',
        constraintLabel: 'Minimum themes',
        limit: THEMES_CONSTRAINTS.count.min,
        received: 1,
      } satisfies ConstraintViolation,
    );
  });

  it('rejects 4 themes (above maximum)', () => {
    assertFirstViolation(
      buildDocument({
        themes: [
          { icon: 'advisory', title: 'Alpha', bullets: [] },
          { icon: 'release', title: 'Beta', bullets: [] },
          { icon: 'roadmap', title: 'Gamma', bullets: [] },
          { icon: 'project', title: 'Delta', bullets: [] },
        ],
      }),
      {
        kind: 'constraint',
        archetype: 'themes',
        constraintLabel: 'Maximum themes',
        limit: THEMES_CONSTRAINTS.count.max,
        received: 4,
      },
    );
  });

  it('rejects a theme heading exceeding 40 characters', () => {
    const longTitle = 'A'.repeat(41);
    assertFirstViolation(
      buildDocument({
        themes: [
          { icon: 'advisory', title: 'Alpha', bullets: [] },
          { icon: 'release', title: longTitle, bullets: [] },
        ],
      }),
      {
        kind: 'constraint',
        archetype: 'themes',
        contextLines: [['Theme', longTitle]],
        constraintLabel: 'Maximum heading length',
        limit: THEMES_CONSTRAINTS.headingLength.max,
        received: 41,
      },
    );
  });

  it('rejects 4 bullets on a theme', () => {
    assertFirstViolation(
      buildDocument({
        themes: [
          { icon: 'advisory', title: 'Alpha', bullets: [] },
          { icon: 'release', title: 'Beta', bullets: ['One', 'Two', 'Three', 'Four'] },
        ],
      }),
      {
        kind: 'constraint',
        archetype: 'themes',
        constraintLabel: 'Maximum bullets per theme',
        limit: THEMES_CONSTRAINTS.bulletsPerTheme.max,
        received: 4,
      },
    );
  });

  it('rejects a bullet exceeding 100 characters', () => {
    const longBullet = 'B'.repeat(101);
    assertFirstViolation(
      buildDocument({
        themes: [
          { icon: 'advisory', title: 'Alpha', bullets: [] },
          { icon: 'release', title: 'Beta', bullets: [longBullet] },
        ],
      }),
      {
        kind: 'constraint',
        archetype: 'themes',
        constraintLabel: 'Maximum bullet length',
        limit: THEMES_CONSTRAINTS.bulletLength.max,
        received: 101,
      },
    );
  });
});

describe('validatePresentation — metric-detail constraint violations (Stage 3)', () => {
  it('rejects a metric entry with 4 supporting bullets', () => {
    assertFirstViolation(
      buildDocument({
        metrics: [
          {
            metric: 'adoption',
            value: 64,
            status: 'attention',
            bullets: ['One', 'Two', 'Three', 'Four'],
          },
        ],
      }),
      {
        kind: 'constraint',
        archetype: 'metric-detail',
        contextLines: [['Metric', 'adoption']],
        constraintLabel: 'Maximum supporting bullets',
        limit: METRIC_DETAIL_CONSTRAINTS.bullets.max,
        received: 4,
      } satisfies ConstraintViolation,
    );
  });
});

describe('validatePresentation — project-status constraint violations (Stage 3)', () => {
  it('rejects 5 phases (VISION §31 example shape)', () => {
    assertFirstViolation(
      buildDocument({
        projects: [
          {
            id: 'proj',
            title: 'Test Initiative',
            icon: 'project',
            status: 'on-track',
            phases: Array.from({ length: 5 }, (_, i) => ({
              title: `Phase ${i + 1}`,
              icon: 'phase',
              epics: [],
            })),
          },
        ],
      }),
      {
        kind: 'constraint',
        archetype: 'project-status',
        contextLines: [['Initiative', 'Test Initiative']],
        constraintLabel: 'Maximum phases',
        limit: PROJECT_STATUS_CONSTRAINTS.phases.max,
        received: 5,
      },
    );
  });

  it('rejects 9 epics in a phase (matches VISION §31 quoted example)', () => {
    assertFirstViolation(
      buildDocument({
        projects: [
          {
            id: 'workspace-assistant',
            title: 'Workspace Assistant Rollout',
            icon: 'project',
            status: 'on-track',
            phases: [
              {
                title: 'Production Readiness',
                icon: 'phase',
                epics: Array.from({ length: 9 }, (_, i) => ({ title: `Epic ${i + 1}` })),
              },
            ],
          },
        ],
      }),
      {
        kind: 'constraint',
        archetype: 'project-status',
        contextLines: [
          ['Initiative', 'Workspace Assistant Rollout'],
          ['Phase', 'Production Readiness'],
        ],
        constraintLabel: 'Maximum epics',
        limit: PROJECT_STATUS_CONSTRAINTS.epicsPerPhase.max,
        received: 9,
      } satisfies ConstraintViolation,
    );
  });

  it('rejects an epic title exceeding 90 characters', () => {
    const longTitle = 'E'.repeat(91);
    assertFirstViolation(
      buildDocument({
        projects: [
          {
            id: 'proj',
            title: 'Initiative',
            icon: 'project',
            status: 'on-track',
            phases: [{ title: 'Phase A', icon: 'phase', epics: [{ title: longTitle }] }],
          },
        ],
      }),
      {
        kind: 'constraint',
        archetype: 'project-status',
        constraintLabel: 'Maximum epic title length',
        limit: PROJECT_STATUS_CONSTRAINTS.epicTitleLength.max,
        received: 91,
      },
    );
  });
});

describe('validatePresentation — notice constraint violations (Stage 3)', () => {
  it('rejects a release title exceeding 80 characters', () => {
    const longTitle = 'R'.repeat(81);
    assertFirstViolation(buildDocument({ releases: [{ title: longTitle }] }), {
      kind: 'constraint',
      archetype: 'release',
      contextLines: [['Release', longTitle]],
      constraintLabel: 'Maximum title length',
      limit: NOTICE_CONSTRAINTS.titleLength.max,
      received: 81,
    } satisfies ConstraintViolation);
  });

  it('rejects a deprecation with 4 bullets', () => {
    assertFirstViolation(
      buildDocument({
        deprecations: [{ title: 'Legacy Export', bullets: ['A', 'B', 'C', 'D'] }],
      }),
      {
        kind: 'constraint',
        archetype: 'deprecation',
        contextLines: [['Deprecation', 'Legacy Export']],
        constraintLabel: 'Maximum bullets',
        limit: NOTICE_CONSTRAINTS.bullets.max,
        received: 4,
      },
    );
  });

  it('rejects an advisory title exceeding 80 characters', () => {
    const longTitle = 'A'.repeat(81);
    assertFirstViolation(buildDocument({ advisories: [{ title: longTitle }] }), {
      kind: 'constraint',
      archetype: 'advisory',
      constraintLabel: 'Maximum title length',
      limit: NOTICE_CONSTRAINTS.titleLength.max,
      received: 81,
    });
  });
});

describe('validatePresentation — roadmap constraint violations (Stage 3)', () => {
  it('rejects 7 roadmap items', () => {
    assertFirstViolation(
      buildDocument({
        roadmap: Array.from({ length: 7 }, (_, i) => ({
          horizon: 'now' as const,
          title: `Item ${i + 1}`,
        })),
      }),
      {
        kind: 'constraint',
        archetype: 'roadmap',
        constraintLabel: 'Maximum roadmap items',
        limit: ROADMAP_CONSTRAINTS.items.max,
        received: 7,
      } satisfies ConstraintViolation,
    );
  });

  it('rejects a roadmap item title exceeding 80 characters', () => {
    const longTitle = 'R'.repeat(81);
    assertFirstViolation(
      buildDocument({ roadmap: [{ horizon: 'now' as const, title: longTitle }] }),
      {
        kind: 'constraint',
        archetype: 'roadmap',
        contextLines: [['Item', longTitle]],
        constraintLabel: 'Maximum item title length',
        limit: ROADMAP_CONSTRAINTS.itemTitleLength.max,
        received: 81,
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Aggregation — multiple violations collected together
// ---------------------------------------------------------------------------

describe('validatePresentation — aggregation', () => {
  it('collects multiple catalog violations before reporting', () => {
    let err!: PresentationValidationError;
    try {
      validatePresentation(
        buildDocument({
          themes: [
            { icon: 'bad-icon-1', title: 'Alpha', bullets: [] },
            { icon: 'bad-icon-2', title: 'Beta', bullets: [] },
          ],
        }),
      );
    } catch (e) {
      err = e as PresentationValidationError;
    }

    expect(err).toBeInstanceOf(PresentationValidationError);
    const catalogViolations = err.violations.filter((v) => v.kind === 'catalog');
    expect(catalogViolations.length).toBe(2);
    expect((catalogViolations[0] as CatalogViolation).unknownValue).toBe('bad-icon-1');
    expect((catalogViolations[1] as CatalogViolation).unknownValue).toBe('bad-icon-2');
  });

  it('collects constraint violations across multiple archetype sections', () => {
    let err!: PresentationValidationError;
    try {
      validatePresentation(
        buildDocument({
          // themes violation: too few
          themes: [{ icon: 'advisory', title: 'Solo', bullets: [] }],
          // roadmap violation: too many items
          roadmap: Array.from({ length: 7 }, (_, i) => ({
            horizon: 'now' as const,
            title: `Item ${i + 1}`,
          })),
        }),
      );
    } catch (e) {
      err = e as PresentationValidationError;
    }

    expect(err).toBeInstanceOf(PresentationValidationError);
    const archetypes = err.violations.map((v) => v.archetype);
    expect(archetypes).toContain('themes');
    expect(archetypes).toContain('roadmap');
    expect(err.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('collects both catalog and constraint violations together', () => {
    let err!: PresentationValidationError;
    try {
      validatePresentation(
        buildDocument({
          // catalog: unknown theme icon
          themes: [
            { icon: 'bad-icon', title: 'Alpha', bullets: [] },
            { icon: 'advisory', title: 'Beta', bullets: [] },
          ],
          // constraint: roadmap too many items
          roadmap: Array.from({ length: 7 }, (_, i) => ({
            horizon: 'later' as const,
            title: `Item ${i + 1}`,
          })),
        }),
      );
    } catch (e) {
      err = e as PresentationValidationError;
    }

    expect(err).toBeInstanceOf(PresentationValidationError);
    const kinds = err.violations.map((v) => v.kind);
    expect(kinds).toContain('catalog');
    expect(kinds).toContain('constraint');
  });

  it('collects per-theme constraint violations across all themes', () => {
    const longBullet = 'B'.repeat(101);
    let err!: PresentationValidationError;
    try {
      validatePresentation(
        buildDocument({
          themes: [
            { icon: 'advisory', title: 'Alpha', bullets: [longBullet] },
            { icon: 'release', title: 'Beta', bullets: [longBullet] },
          ],
        }),
      );
    } catch (e) {
      err = e as PresentationValidationError;
    }

    expect(err).toBeInstanceOf(PresentationValidationError);
    const bulletViolations = err.violations.filter(
      (v) => v.kind === 'constraint' && v.constraintLabel === 'Maximum bullet length',
    );
    expect(bulletViolations.length).toBe(2); // one per theme
  });
});

// ---------------------------------------------------------------------------
// PresentationValidationError — error structure and message format
// ---------------------------------------------------------------------------

describe('PresentationValidationError — structure and message format', () => {
  it('has a name of PresentationValidationError', () => {
    const err = new PresentationValidationError([
      {
        kind: 'constraint',
        archetype: 'roadmap',
        contextLines: [],
        constraintLabel: 'Maximum roadmap items',
        limit: 6,
        received: 8,
      },
    ]);
    expect(err.name).toBe('PresentationValidationError');
    expect(err).toBeInstanceOf(Error);
  });

  it('exposes violations array with all collected violations', () => {
    const violations = [
      {
        kind: 'constraint' as const,
        archetype: 'themes',
        contextLines: [] as ReadonlyArray<readonly [string, string]>,
        constraintLabel: 'Minimum themes',
        limit: 2,
        received: 1,
      },
      {
        kind: 'catalog' as const,
        archetype: 'project-status',
        contextLines: [['Initiative', 'Test']] as ReadonlyArray<readonly [string, string]>,
        catalogName: 'icon id',
        unknownValue: 'bad-icon',
        expectedIds: ['project', 'phase'],
      },
    ];
    const err = new PresentationValidationError(violations);
    expect(err.violations).toHaveLength(2);
    expect(err.violations[0]).toEqual(violations[0]);
    expect(err.violations[1]).toEqual(violations[1]);
  });

  it('message follows the VISION §31 ERROR format for constraint violations', () => {
    const err = new PresentationValidationError([
      {
        kind: 'constraint',
        archetype: 'project-status',
        contextLines: [
          ['Initiative', 'Workspace Assistant Rollout'],
          ['Phase', 'Production Readiness'],
        ],
        constraintLabel: 'Maximum epics',
        limit: 5,
        received: 9,
      },
    ]);

    expect(err.message).toContain('ERROR');
    expect(err.message).toContain('Slide archetype: project-status');
    expect(err.message).toContain('Initiative: Workspace Assistant Rollout');
    expect(err.message).toContain('Phase: Production Readiness');
    expect(err.message).toContain('Maximum epics: 5');
    expect(err.message).toContain('Received: 9');
  });

  it('message follows the VISION §31 ERROR format for catalog violations', () => {
    const err = new PresentationValidationError([
      {
        kind: 'catalog',
        archetype: 'themes',
        contextLines: [['Theme', 'Foundation']],
        catalogName: 'icon id',
        unknownValue: 'not-an-icon',
        expectedIds: ['advisory', 'project'],
      },
    ]);

    expect(err.message).toContain('ERROR');
    expect(err.message).toContain('Slide archetype: themes');
    expect(err.message).toContain('Theme: Foundation');
    expect(err.message).toContain('Unknown icon id: "not-an-icon"');
    expect(err.message).toContain('Expected one of: advisory, project');
  });

  it('message includes a header describing the violation count', () => {
    const makeConstraint = (archetype: string): ConstraintViolation => ({
      kind: 'constraint',
      archetype,
      contextLines: [],
      constraintLabel: 'Maximum roadmap items',
      limit: 6,
      received: 8,
    });

    const one = new PresentationValidationError([makeConstraint('roadmap')]);
    expect(one.message).toContain('1 violation');

    const two = new PresentationValidationError([
      makeConstraint('roadmap'),
      makeConstraint('themes'),
    ]);
    expect(two.message).toContain('2 violations');
  });

  it('includes all violation blocks in the message when multiple violations exist', () => {
    const err = new PresentationValidationError([
      {
        kind: 'constraint',
        archetype: 'themes',
        contextLines: [],
        constraintLabel: 'Minimum themes',
        limit: 2,
        received: 1,
      },
      {
        kind: 'catalog',
        archetype: 'project-status',
        contextLines: [['Initiative', 'Test Project']],
        catalogName: 'icon id',
        unknownValue: 'assistant-fake',
        expectedIds: ['project'],
      },
    ]);

    // Both violation blocks appear in the message
    expect(err.message).toContain('Slide archetype: themes');
    expect(err.message).toContain('Slide archetype: project-status');
  });
});
