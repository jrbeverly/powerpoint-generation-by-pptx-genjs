import { z } from 'zod';

import { bulletSchema, iconIdSchema, productIdSchema, statusSchema } from './common.js';
import { metricEntrySchema } from './metrics.js';
import { projectSchema } from './projects.js';

/**
 * Current version of the Presentation JSON contract (VISION §5).
 *
 * The document root carries this literal under `version`. A schema evolution
 * bumps this value and adapts the schemas; input carrying any other version
 * is rejected at parse time rather than silently misrendered.
 */
export const PRESENTATION_SCHEMA_VERSION = '1.0' as const;

/** Versions accepted by the parser (currently only `"1.0"`). */
export type PresentationSchemaVersion = typeof PRESENTATION_SCHEMA_VERSION;

/** ISO sprint date range, `YYYY-MM-DD/YYYY-MM-DD` (VISION §12, §37). */
const DATE_RANGE_PATTERN = /^\d{4}-\d{2}-\d{2}\/\d{4}-\d{2}-\d{2}$/;

/**
 * A sprint theme: large icon, prominent heading, and a few short bullets
 * (VISION §13, §37).
 */
export const themeSchema = z.strictObject({
  icon: iconIdSchema,
  title: z.string().min(1),
  bullets: z.array(bulletSchema),
});
export type Theme = z.infer<typeof themeSchema>;

/**
 * A newly delivered capability currently being released (VISION §20).
 */
export const releaseSchema = z.strictObject({
  /** Product identity shown in the header; defaults to the presentation product. */
  product: productIdSchema.optional(),
  title: z.string().min(1),
  /** Concise availability status, e.g. "Available this sprint". */
  status: z.string().min(1).optional(),
  /** Optional state indicator. */
  state: statusSchema.optional(),
  bullets: z.array(bulletSchema).optional(),
});
export type Release = z.infer<typeof releaseSchema>;

/**
 * Something being deprecated: what is going away, which product is affected,
 * lifecycle state, important date, and expected action (VISION §21).
 */
export const deprecationSchema = z.strictObject({
  product: productIdSchema.optional(),
  title: z.string().min(1),
  /**
   * Important date, e.g. "October 31"; the renderer composes the
   * "Retirement:" label.
   */
  retirementDate: z.string().min(1).optional(),
  state: statusSchema.optional(),
  bullets: z.array(bulletSchema).optional(),
});
export type Deprecation = z.infer<typeof deprecationSchema>;

/**
 * Important information that does not necessarily correspond to a project or
 * release (VISION §22).
 */
export const advisorySchema = z.strictObject({
  product: productIdSchema.optional(),
  title: z.string().min(1),
  /** Required action / deadline, e.g. "Action required before September 15". */
  action: z.string().min(1).optional(),
  bullets: z.array(bulletSchema).optional(),
});
export type Advisory = z.infer<typeof advisorySchema>;

/** Time horizon of a roadmap item (VISION §23). */
export const ROADMAP_HORIZONS = ['now', 'next', 'later'] as const;
export const roadmapHorizonSchema = z.enum(ROADMAP_HORIZONS);
export type RoadmapHorizon = z.infer<typeof roadmapHorizonSchema>;

/**
 * A roadmap item: what viewers should expect next, grouped by horizon
 * (VISION §23). Deliberately not a Gantt chart.
 */
export const roadmapItemSchema = z.strictObject({
  horizon: roadmapHorizonSchema,
  title: z.string().min(1),
});
export type RoadmapItem = z.infer<typeof roadmapItemSchema>;

/**
 * Semantic content of one presentation (VISION §5, §37): what the
 * presentation says, never how PowerPoint draws it. No coordinates, fonts,
 * sizes, or colors appear anywhere in this model.
 */
export const presentationSchema = z.strictObject({
  title: z.string().min(1),
  /** Team / product context line shown under the title (VISION §5, §12). */
  subtitle: z.string().min(1).optional(),
  sprint: z.string().min(1),
  /** Sprint range shown on the overview slide (VISION §12). */
  dateRange: z.string().regex(DATE_RANGE_PATTERN).optional(),
  product: productIdSchema,
  themes: z.array(themeSchema),
  metrics: z.array(metricEntrySchema),
  projects: z.array(projectSchema),
  releases: z.array(releaseSchema),
  deprecations: z.array(deprecationSchema),
  advisories: z.array(advisorySchema),
  roadmap: z.array(roadmapItemSchema),
});
export type Presentation = z.infer<typeof presentationSchema>;

/**
 * The top-level Presentation JSON document: a schema `version` plus the
 * presentation content (VISION §37).
 */
export const presentationDocumentSchema = z.strictObject({
  version: z.literal(PRESENTATION_SCHEMA_VERSION),
  presentation: presentationSchema,
});
export type PresentationDocument = z.infer<typeof presentationDocumentSchema>;

/**
 * Validates and parses a Presentation JSON document.
 *
 * Throws a `ZodError` listing every violation when the input does not
 * conform. Unknown versions, unknown keys, and values outside the catalog
 * vocabularies fail loudly (VISION §31).
 */
export function parsePresentation(input: unknown): PresentationDocument {
  return presentationDocumentSchema.parse(input);
}
