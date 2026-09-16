import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  type IconId,
  type ProductId,
  type ProjectStatus,
  type Status,
  type Trend,
} from '../src/schema/common.js';
import { METRIC_IDS, type MetricEntry, type MetricId } from '../src/schema/metrics.js';
import {
  PRESENTATION_SCHEMA_VERSION,
  parsePresentation,
  presentationDocumentSchema,
  type PresentationDocument,
  type RoadmapHorizon,
} from '../src/schema/presentation.js';

/**
 * The VISION §37 example input, transcribed verbatim and typed against the
 * schema. Annotating it `PresentationDocument` proves the example type-checks;
 * `parsePresentation` proves it parses at runtime.
 */
const example37: PresentationDocument = {
  version: '1.0',
  presentation: {
    title: 'Sprint 42 Overview',
    sprint: 'Sprint 42',
    dateRange: '2026-08-10/2026-08-21',
    product: 'atlas',

    themes: [
      {
        icon: 'foundation',
        title: 'Foundation',
        bullets: ['Complete migration', 'Remove remaining legacy paths'],
      },
      {
        icon: 'adoption',
        title: 'Adoption',
        bullets: ['Expand pilot population', 'Validate engagement'],
      },
      {
        icon: 'reliability',
        title: 'Reliability',
        bullets: ['Improve telemetry', 'Reduce recurring failures'],
      },
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

    releases: [],
    deprecations: [],
    advisories: [],
    roadmap: [],
  },
};

/**
 * The VISION §20–§23 notice and roadmap content, so those sections are
 * exercised as well.
 */
const fullExample: PresentationDocument = {
  version: '1.0',
  presentation: {
    title: 'Sprint 42 Overview',
    subtitle: 'Platform Engineering',
    sprint: 'Sprint 42',
    dateRange: '2026-08-10/2026-08-21',
    product: 'atlas',
    themes: [],
    metrics: [{ metric: 'adoption', value: 64, trend: 'up', status: 'attention' }],
    projects: [],
    releases: [
      {
        product: 'atlas',
        title: 'New analytics experience',
        status: 'Available this sprint',
        state: 'healthy',
        bullets: [
          'New dashboard experience released',
          'Existing users migrated automatically',
          'Documentation published',
        ],
      },
    ],
    deprecations: [
      {
        product: 'atlas',
        title: 'Legacy report export',
        retirementDate: 'October 31',
        state: 'attention',
        bullets: [
          'New exports should use Reporting API v2',
          'Existing integrations remain functional until retirement',
        ],
      },
    ],
    advisories: [
      {
        product: 'atlas',
        title: 'Authentication change',
        action: 'Action required before September 15',
        bullets: [
          'Existing tokens continue to function',
          'New integrations must use the updated authentication flow',
        ],
      },
    ],
    roadmap: [
      { horizon: 'now', title: 'Improve pilot telemetry' },
      { horizon: 'next', title: 'Expand availability' },
      { horizon: 'later', title: 'Introduce automated governance controls' },
    ],
  },
};

/** Builds a valid document shell, optionally overriding presentation fields. */
function buildDocument(presentationOverrides: Record<string, unknown> = {}): unknown {
  return {
    version: '1.0',
    presentation: {
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
      ...presentationOverrides,
    },
  };
}

describe('presentation schema', () => {
  it('parses the VISION §37 example input', () => {
    const doc = parsePresentation(example37);

    expect(doc.version).toBe('1.0');
    expect(doc.presentation.title).toBe('Sprint 42 Overview');
    expect(doc.presentation.sprint).toBe('Sprint 42');
    expect(doc.presentation.dateRange).toBe('2026-08-10/2026-08-21');
    expect(doc.presentation.product).toBe('atlas');

    expect(doc.presentation.themes).toHaveLength(3);
    expect(doc.presentation.themes[0]).toEqual({
      icon: 'foundation',
      title: 'Foundation',
      bullets: ['Complete migration', 'Remove remaining legacy paths'],
    });

    expect(doc.presentation.metrics).toHaveLength(4);
    expect(doc.presentation.metrics[0]).toEqual({
      metric: 'delivery-confidence',
      value: 92,
      trend: 'up',
      status: 'healthy',
    });

    expect(doc.presentation.projects).toHaveLength(1);
    const project = doc.presentation.projects[0];
    expect(project?.id).toBe('workspace-assistant');
    expect(project?.phases).toHaveLength(2);
    expect(project?.phases[0]?.epics.map((epic) => epic.title)).toEqual([
      'Expand pilot population',
      'Establish usage telemetry',
    ]);

    for (const section of ['releases', 'deprecations', 'advisories', 'roadmap'] as const) {
      expect(doc.presentation[section]).toEqual([]);
    }
  });

  it('accepts a minimal, all-empty presentation (VISION §5 shape)', () => {
    const doc = parsePresentation(buildDocument({ subtitle: 'Platform Engineering' }));
    expect(doc.presentation.title).toBe('Sprint 1 Overview');
    expect(doc.presentation.subtitle).toBe('Platform Engineering');
    expect(doc.presentation.dateRange).toBeUndefined();
    expect(doc.presentation.themes).toEqual([]);
  });

  it('parses release, deprecation, advisory, and roadmap sections', () => {
    const doc = parsePresentation(fullExample);

    expect(doc.presentation.releases[0]).toEqual({
      product: 'atlas',
      title: 'New analytics experience',
      status: 'Available this sprint',
      state: 'healthy',
      bullets: [
        'New dashboard experience released',
        'Existing users migrated automatically',
        'Documentation published',
      ],
    });
    expect(doc.presentation.deprecations[0]?.retirementDate).toBe('October 31');
    expect(doc.presentation.advisories[0]?.action).toBe('Action required before September 15');
    expect(doc.presentation.roadmap.map((item) => item.horizon)).toEqual(['now', 'next', 'later']);
  });

  it('declares and enforces the schema version', () => {
    expect(PRESENTATION_SCHEMA_VERSION).toBe('1.0');
    expect(example37.version).toBe(PRESENTATION_SCHEMA_VERSION);

    const unknownVersion = buildDocument();
    (unknownVersion as Record<string, unknown>).version = '2.0';
    try {
      parsePresentation(unknownVersion);
      expect.unreachable('unknown schema version must be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).issues[0]?.path).toEqual(['version']);
    }

    const missingVersion = { ...(buildDocument() as Record<string, unknown>) };
    delete missingVersion.version;
    try {
      parsePresentation(missingVersion);
      expect.unreachable('missing schema version must be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      expect((error as z.ZodError).issues[0]?.path).toEqual(['version']);
    }
  });

  it('accepts only catalog metric ids (VISION §14)', () => {
    for (const id of METRIC_IDS) {
      const doc = parsePresentation(
        buildDocument({ metrics: [{ metric: id, value: 50, status: 'healthy' }] }),
      );
      expect(doc.presentation.metrics[0]?.metric).toBe(id);
    }

    const unknownMetric = buildDocument({
      metrics: [{ metric: 'not-a-metric', value: 50, status: 'healthy' }],
    });
    try {
      parsePresentation(unknownMetric);
      expect.unreachable('unknown metric id must be rejected');
    } catch (error) {
      expect(error).toBeInstanceOf(z.ZodError);
      const issue = (error as z.ZodError).issues[0];
      expect(issue?.path).toEqual(['presentation', 'metrics', 0, 'metric']);
      expect(issue?.message).toContain('expected one of');
    }
  });

  it('rejects free-form visual data (VISION §5 inappropriate example)', () => {
    const visualData = buildDocument({
      metrics: [
        {
          metric: 'adoption',
          value: 64,
          status: 'healthy',
          iconX: 0.45,
          fontSize: 24,
          progressBarWidth: 5.7,
        },
      ],
    });
    expect(() => parsePresentation(visualData)).toThrow(/Unrecognized key/);
  });

  it('enforces the status, trend, and date-range vocabularies', () => {
    expect(() =>
      parsePresentation(
        buildDocument({ metrics: [{ metric: 'adoption', value: 64, status: 'ok' }] }),
      ),
    ).toThrow(z.ZodError);

    expect(() =>
      parsePresentation(
        buildDocument({
          metrics: [{ metric: 'adoption', value: 64, status: 'healthy', trend: 'sideways' }],
        }),
      ),
    ).toThrow(z.ZodError);

    expect(() => parsePresentation(buildDocument({ dateRange: 'August 10–21' }))).toThrow(
      z.ZodError,
    );
    expect(() =>
      parsePresentation(buildDocument({ dateRange: '2026-08-10/2026-08-21' })),
    ).not.toThrow();
  });

  it('rejects mistyped values (VISION §5 string metric value)', () => {
    expect(() =>
      parsePresentation(
        buildDocument({ metrics: [{ metric: 'adoption', value: '64%', status: 'healthy' }] }),
      ),
    ).toThrow(z.ZodError);
  });

  it('types catalog references as ids, not visual data', () => {
    const metricId: MetricId = 'delivery-confidence';
    const productId: ProductId = 'atlas';
    const iconId: IconId = 'foundation';
    const trend: Trend = 'up';
    const status: Status = 'healthy';
    const projectStatus: ProjectStatus = 'on-track';
    const horizon: RoadmapHorizon = 'now';

    expect([metricId, productId, iconId, trend, status, projectStatus, horizon]).toEqual([
      'delivery-confidence',
      'atlas',
      'foundation',
      'up',
      'healthy',
      'on-track',
      'now',
    ]);
  });

  it('round-trips a valid document through JSON without loss', () => {
    for (const input of [example37, fullExample]) {
      const revived = parsePresentation(JSON.parse(JSON.stringify(input)) as unknown);
      expect(revived).toEqual(input);
    }
  });

  it('exposes the validator for direct consumption', () => {
    expect(presentationDocumentSchema.safeParse(example37).success).toBe(true);
    const metric: MetricEntry = example37.presentation.metrics[0] as MetricEntry;
    expect(metric.metric).toBe('delivery-confidence');
  });
});
