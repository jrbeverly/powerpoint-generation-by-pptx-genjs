import { describe, expect, it } from 'vitest';

import {
  METRIC_DETAIL_CONSTRAINTS,
  NOTICE_CONSTRAINTS,
  PROJECT_STATUS_CONSTRAINTS,
  ROADMAP_CONSTRAINTS,
  THEMES_CONSTRAINTS,
} from '../src/constraints/archetypes.js';
import { ConstraintViolationError, validateConstraints } from '../src/constraints/validate.js';
import type { Presentation } from '../src/schema/presentation.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPresentation(overrides: Partial<Presentation> = {}): Presentation {
  return {
    title: 'Sprint 1 Overview',
    sprint: 'Sprint 1',
    product: 'atlas',
    themes: [],
    metrics: [],
    projects: [],
    releases: [],
    deprecations: [],
    advisories: [],
    roadmap: [],
    ...overrides,
  };
}

function makeTheme(title: string, bullets: string[] = []) {
  return { icon: 'test-icon', title, bullets };
}

function assertViolation(
  presentation: Presentation,
  expected: {
    archetype: string;
    constraintLabel: string;
    limit: number;
    received: number;
    contextLines?: ReadonlyArray<readonly [string, string]>;
  },
) {
  try {
    validateConstraints(presentation);
    expect.unreachable('expected ConstraintViolationError to be thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(ConstraintViolationError);
    const e = err as ConstraintViolationError;
    expect(e.archetype).toBe(expected.archetype);
    expect(e.constraintLabel).toBe(expected.constraintLabel);
    expect(e.limit).toBe(expected.limit);
    expect(e.received).toBe(expected.received);
    if (expected.contextLines) {
      expect(e.contextLines).toEqual(expected.contextLines);
    }
  }
}

// ---------------------------------------------------------------------------
// Error message format (VISION §31)
// ---------------------------------------------------------------------------

describe('ConstraintViolationError message format', () => {
  it('matches the VISION §31 format: archetype + context + blank line + constraint + received', () => {
    const err = new ConstraintViolationError({
      archetype: 'project-status',
      contextLines: [
        ['Initiative', 'Workspace Assistant Rollout'],
        ['Phase', 'Production Readiness'],
      ],
      constraintLabel: 'Maximum epics',
      limit: 5,
      received: 9,
    });

    expect(err.message).toBe(
      [
        'Slide archetype: project-status',
        'Initiative: Workspace Assistant Rollout',
        'Phase: Production Readiness',
        '',
        'Maximum epics: 5',
        'Received: 9',
      ].join('\n'),
    );
    expect(err.name).toBe('ConstraintViolationError');
  });

  it('omits the context block when no context lines are supplied', () => {
    const err = new ConstraintViolationError({
      archetype: 'roadmap',
      constraintLabel: 'Maximum roadmap items',
      limit: 6,
      received: 8,
    });

    expect(err.message).toBe(
      ['Slide archetype: roadmap', '', 'Maximum roadmap items: 6', 'Received: 8'].join('\n'),
    );
  });
});

// ---------------------------------------------------------------------------
// Happy path: valid presentations pass without throwing
// ---------------------------------------------------------------------------

describe('validateConstraints — valid presentations', () => {
  it('passes for an empty (all-array) presentation', () => {
    expect(() => validateConstraints(buildPresentation())).not.toThrow();
  });

  it('passes for the VISION §37 example (3 themes, 4 metrics, 1 project/2 phases/2 epics)', () => {
    const presentation = buildPresentation({
      themes: [
        makeTheme('Foundation', ['Complete migration', 'Remove remaining legacy paths']),
        makeTheme('Adoption', ['Expand pilot population', 'Validate engagement']),
        makeTheme('Reliability', ['Improve telemetry', 'Reduce recurring failures']),
      ],
      metrics: [
        { metric: 'delivery-confidence', value: 92, trend: 'up', status: 'healthy' },
        { metric: 'quality', value: 87, trend: 'flat', status: 'healthy' },
        { metric: 'adoption', value: 64, trend: 'up', status: 'attention' },
        { metric: 'operational-health', value: 96, trend: 'up', status: 'healthy' },
      ],
      projects: [
        {
          id: 'workspace-assistant',
          title: 'Workspace Assistant Rollout',
          icon: 'initiative',
          status: 'on-track',
          phases: [
            {
              title: 'Pilot Expansion',
              icon: 'pilot',
              epics: [{ title: 'Expand pilot population' }, { title: 'Establish usage telemetry' }],
            },
            {
              title: 'Production Readiness',
              icon: 'production',
              epics: [{ title: 'Finalize support model' }, { title: 'Publish user guidance' }],
            },
          ],
        },
      ],
    });
    expect(() => validateConstraints(presentation)).not.toThrow();
  });

  it('allows themes = [] (section omitted — no archetype rendered)', () => {
    expect(() => validateConstraints(buildPresentation({ themes: [] }))).not.toThrow();
  });

  it('allows exactly 2 themes (minimum)', () => {
    expect(() =>
      validateConstraints(buildPresentation({ themes: [makeTheme('Alpha'), makeTheme('Beta')] })),
    ).not.toThrow();
  });

  it('allows exactly 3 themes (maximum)', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({
          themes: [makeTheme('Alpha'), makeTheme('Beta'), makeTheme('Gamma')],
        }),
      ),
    ).not.toThrow();
  });

  it('allows up to 3 bullets per theme', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({
          themes: [
            makeTheme('Alpha'),
            makeTheme('Beta', ['Bullet one', 'Bullet two', 'Bullet three']),
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('allows up to 5 epics per phase', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({
          projects: [
            {
              id: 'p',
              title: 'Project',
              icon: 'project',
              status: 'on-track',
              phases: [
                {
                  title: 'Phase A',
                  icon: 'phase',
                  epics: [
                    { title: 'Epic 1' },
                    { title: 'Epic 2' },
                    { title: 'Epic 3' },
                    { title: 'Epic 4' },
                    { title: 'Epic 5' },
                  ],
                },
              ],
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('allows up to 3 metric supporting bullets', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({
          metrics: [
            {
              metric: 'adoption',
              value: 64,
              status: 'attention',
              bullets: ['Pilot group expanded', 'Usage increasing', 'Target on track'],
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('allows up to 6 roadmap items', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({
          roadmap: [
            { horizon: 'now', title: 'Item 1' },
            { horizon: 'now', title: 'Item 2' },
            { horizon: 'next', title: 'Item 3' },
            { horizon: 'next', title: 'Item 4' },
            { horizon: 'later', title: 'Item 5' },
            { horizon: 'later', title: 'Item 6' },
          ],
        }),
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Themes archetype violations
// ---------------------------------------------------------------------------

describe('validateConstraints — themes archetype violations', () => {
  it('rejects 1 theme (below minimum)', () => {
    assertViolation(buildPresentation({ themes: [makeTheme('Solo')] }), {
      archetype: 'themes',
      constraintLabel: 'Minimum themes',
      limit: THEMES_CONSTRAINTS.count.min,
      received: 1,
    });
  });

  it('rejects 4 themes (above maximum)', () => {
    assertViolation(
      buildPresentation({
        themes: [makeTheme('Alpha'), makeTheme('Beta'), makeTheme('Gamma'), makeTheme('Delta')],
      }),
      {
        archetype: 'themes',
        constraintLabel: 'Maximum themes',
        limit: THEMES_CONSTRAINTS.count.max,
        received: 4,
      },
    );
  });

  it('rejects a theme heading exceeding 40 characters', () => {
    const longTitle = 'A'.repeat(41);
    assertViolation(buildPresentation({ themes: [makeTheme('Alpha'), makeTheme(longTitle)] }), {
      archetype: 'themes',
      contextLines: [['Theme', longTitle]],
      constraintLabel: 'Maximum heading length',
      limit: THEMES_CONSTRAINTS.headingLength.max,
      received: 41,
    });
  });

  it('accepts a theme heading of exactly 40 characters', () => {
    const maxTitle = 'A'.repeat(40);
    expect(() =>
      validateConstraints(buildPresentation({ themes: [makeTheme('Alpha'), makeTheme(maxTitle)] })),
    ).not.toThrow();
  });

  it('rejects 4 bullets on a single theme', () => {
    assertViolation(
      buildPresentation({
        themes: [makeTheme('Alpha'), makeTheme('Beta', ['One', 'Two', 'Three', 'Four'])],
      }),
      {
        archetype: 'themes',
        contextLines: [['Theme', 'Beta']],
        constraintLabel: 'Maximum bullets per theme',
        limit: THEMES_CONSTRAINTS.bulletsPerTheme.max,
        received: 4,
      },
    );
  });

  it('rejects a bullet exceeding 100 characters', () => {
    const longBullet = 'B'.repeat(101);
    assertViolation(
      buildPresentation({
        themes: [makeTheme('Alpha'), makeTheme('Beta', [longBullet])],
      }),
      {
        archetype: 'themes',
        contextLines: [['Theme', 'Beta']],
        constraintLabel: 'Maximum bullet length',
        limit: THEMES_CONSTRAINTS.bulletLength.max,
        received: 101,
      },
    );
  });

  it('accepts a bullet of exactly 100 characters', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({
          themes: [makeTheme('Alpha'), makeTheme('Beta', ['B'.repeat(100)])],
        }),
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Metric Detail archetype violations
// ---------------------------------------------------------------------------

describe('validateConstraints — metric-detail archetype violations', () => {
  it('rejects a metric entry with 4 supporting bullets', () => {
    assertViolation(
      buildPresentation({
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
        archetype: 'metric-detail',
        contextLines: [['Metric', 'adoption']],
        constraintLabel: 'Maximum supporting bullets',
        limit: METRIC_DETAIL_CONSTRAINTS.bullets.max,
        received: 4,
      },
    );
  });

  it('reports the correct metric id in context when the second metric violates', () => {
    assertViolation(
      buildPresentation({
        metrics: [
          { metric: 'adoption', value: 64, status: 'healthy' },
          {
            metric: 'quality',
            value: 90,
            status: 'healthy',
            bullets: ['A', 'B', 'C', 'D'],
          },
        ],
      }),
      {
        archetype: 'metric-detail',
        contextLines: [['Metric', 'quality']],
        constraintLabel: 'Maximum supporting bullets',
        limit: METRIC_DETAIL_CONSTRAINTS.bullets.max,
        received: 4,
      },
    );
  });
});

// ---------------------------------------------------------------------------
// Project Status archetype violations
// ---------------------------------------------------------------------------

describe('validateConstraints — project-status archetype violations', () => {
  function makeProject(phases: { title: string; epics: { title: string }[] }[]) {
    return {
      id: 'proj',
      title: 'Test Initiative',
      icon: 'project',
      status: 'on-track' as const,
      phases: phases.map((p) => ({ icon: 'phase', ...p })),
    };
  }

  it('rejects a project with 5 phases', () => {
    assertViolation(
      buildPresentation({
        projects: [
          makeProject([
            { title: 'Phase 1', epics: [] },
            { title: 'Phase 2', epics: [] },
            { title: 'Phase 3', epics: [] },
            { title: 'Phase 4', epics: [] },
            { title: 'Phase 5', epics: [] },
          ]),
        ],
      }),
      {
        archetype: 'project-status',
        contextLines: [['Initiative', 'Test Initiative']],
        constraintLabel: 'Maximum phases',
        limit: PROJECT_STATUS_CONSTRAINTS.phases.max,
        received: 5,
      },
    );
  });

  it('rejects 6 epics in a phase (matches VISION §31 example shape)', () => {
    assertViolation(
      buildPresentation({
        projects: [
          makeProject([
            {
              title: 'Production Readiness',
              epics: [
                { title: 'Epic 1' },
                { title: 'Epic 2' },
                { title: 'Epic 3' },
                { title: 'Epic 4' },
                { title: 'Epic 5' },
                { title: 'Epic 6' },
              ],
            },
          ]),
        ],
      }),
      {
        archetype: 'project-status',
        contextLines: [
          ['Initiative', 'Test Initiative'],
          ['Phase', 'Production Readiness'],
        ],
        constraintLabel: 'Maximum epics',
        limit: PROJECT_STATUS_CONSTRAINTS.epicsPerPhase.max,
        received: 6,
      },
    );
  });

  it('rejects an epic title exceeding 90 characters', () => {
    const longTitle = 'E'.repeat(91);
    assertViolation(
      buildPresentation({
        projects: [makeProject([{ title: 'Phase A', epics: [{ title: longTitle }] }])],
      }),
      {
        archetype: 'project-status',
        contextLines: [
          ['Initiative', 'Test Initiative'],
          ['Phase', 'Phase A'],
        ],
        constraintLabel: 'Maximum epic title length',
        limit: PROJECT_STATUS_CONSTRAINTS.epicTitleLength.max,
        received: 91,
      },
    );
  });

  it('accepts an epic title of exactly 90 characters', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({
          projects: [makeProject([{ title: 'Phase A', epics: [{ title: 'E'.repeat(90) }] }])],
        }),
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Notice archetype violations (release, deprecation, advisory)
// ---------------------------------------------------------------------------

describe('validateConstraints — notice archetype violations', () => {
  it('rejects a release title exceeding 80 characters', () => {
    const longTitle = 'R'.repeat(81);
    assertViolation(buildPresentation({ releases: [{ title: longTitle }] }), {
      archetype: 'release',
      contextLines: [['Release', longTitle]],
      constraintLabel: 'Maximum title length',
      limit: NOTICE_CONSTRAINTS.titleLength.max,
      received: 81,
    });
  });

  it('rejects a release with 4 bullets', () => {
    assertViolation(
      buildPresentation({
        releases: [{ title: 'New Feature', bullets: ['A', 'B', 'C', 'D'] }],
      }),
      {
        archetype: 'release',
        contextLines: [['Release', 'New Feature']],
        constraintLabel: 'Maximum bullets',
        limit: NOTICE_CONSTRAINTS.bullets.max,
        received: 4,
      },
    );
  });

  it('rejects a deprecation title exceeding 80 characters', () => {
    const longTitle = 'D'.repeat(81);
    assertViolation(buildPresentation({ deprecations: [{ title: longTitle }] }), {
      archetype: 'deprecation',
      contextLines: [['Deprecation', longTitle]],
      constraintLabel: 'Maximum title length',
      limit: NOTICE_CONSTRAINTS.titleLength.max,
      received: 81,
    });
  });

  it('rejects a deprecation with 4 bullets', () => {
    assertViolation(
      buildPresentation({
        deprecations: [{ title: 'Legacy Export', bullets: ['A', 'B', 'C', 'D'] }],
      }),
      {
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
    assertViolation(buildPresentation({ advisories: [{ title: longTitle }] }), {
      archetype: 'advisory',
      contextLines: [['Advisory', longTitle]],
      constraintLabel: 'Maximum title length',
      limit: NOTICE_CONSTRAINTS.titleLength.max,
      received: 81,
    });
  });

  it('rejects an advisory with 4 bullets', () => {
    assertViolation(
      buildPresentation({
        advisories: [{ title: 'Auth Change', bullets: ['A', 'B', 'C', 'D'] }],
      }),
      {
        archetype: 'advisory',
        contextLines: [['Advisory', 'Auth Change']],
        constraintLabel: 'Maximum bullets',
        limit: NOTICE_CONSTRAINTS.bullets.max,
        received: 4,
      },
    );
  });

  it('accepts notice items at the boundary (exactly 3 bullets, 80-char title)', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({
          releases: [{ title: 'R'.repeat(80), bullets: ['X', 'Y', 'Z'] }],
          deprecations: [{ title: 'D'.repeat(80), bullets: ['X', 'Y', 'Z'] }],
          advisories: [{ title: 'A'.repeat(80), bullets: ['X', 'Y', 'Z'] }],
        }),
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Roadmap archetype violations
// ---------------------------------------------------------------------------

describe('validateConstraints — roadmap archetype violations', () => {
  it('rejects 7 roadmap items', () => {
    assertViolation(
      buildPresentation({
        roadmap: [
          { horizon: 'now', title: 'Item 1' },
          { horizon: 'now', title: 'Item 2' },
          { horizon: 'next', title: 'Item 3' },
          { horizon: 'next', title: 'Item 4' },
          { horizon: 'later', title: 'Item 5' },
          { horizon: 'later', title: 'Item 6' },
          { horizon: 'later', title: 'Item 7' },
        ],
      }),
      {
        archetype: 'roadmap',
        constraintLabel: 'Maximum roadmap items',
        limit: ROADMAP_CONSTRAINTS.items.max,
        received: 7,
      },
    );
  });

  it('rejects a roadmap item title exceeding 80 characters', () => {
    const longTitle = 'R'.repeat(81);
    assertViolation(buildPresentation({ roadmap: [{ horizon: 'now', title: longTitle }] }), {
      archetype: 'roadmap',
      contextLines: [['Item', longTitle]],
      constraintLabel: 'Maximum item title length',
      limit: ROADMAP_CONSTRAINTS.itemTitleLength.max,
      received: 81,
    });
  });

  it('accepts a roadmap item title of exactly 80 characters', () => {
    expect(() =>
      validateConstraints(
        buildPresentation({ roadmap: [{ horizon: 'now', title: 'R'.repeat(80) }] }),
      ),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Constraint table — values match rationale
// ---------------------------------------------------------------------------

describe('constraint constants — documented values', () => {
  it('themes.count spans 2–3 for a two-or-three-column layout', () => {
    expect(THEMES_CONSTRAINTS.count.min).toBe(2);
    expect(THEMES_CONSTRAINTS.count.max).toBe(3);
  });

  it('project-status limits match VISION §30 spec', () => {
    expect(PROJECT_STATUS_CONSTRAINTS.phases.max).toBe(4);
    expect(PROJECT_STATUS_CONSTRAINTS.epicsPerPhase.max).toBe(5);
    expect(PROJECT_STATUS_CONSTRAINTS.epicTitleLength.max).toBe(90);
  });

  it('metric-detail bullet limit matches VISION §30 spec', () => {
    expect(METRIC_DETAIL_CONSTRAINTS.bullets.max).toBe(3);
  });
});
