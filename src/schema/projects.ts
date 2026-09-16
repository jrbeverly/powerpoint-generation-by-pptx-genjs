import { z } from 'zod';

import { iconIdSchema, projectStatusSchema } from './common.js';

/**
 * An epic within a phase (VISION §18, §37).
 *
 * Epics are deliberately more expressive than raw issue-tracker epic titles;
 * only the display title is part of the contract.
 */
export const epicSchema = z.strictObject({
  title: z.string().min(1),
});
export type Epic = z.infer<typeof epicSchema>;

/**
 * A phase / workstream of an initiative: a smaller heading with its own icon
 * grouping the epics underneath it (VISION §18).
 */
export const phaseSchema = z.strictObject({
  title: z.string().min(1),
  icon: iconIdSchema,
  epics: z.array(epicSchema),
});
export type Phase = z.infer<typeof phaseSchema>;

/**
 * A project / initiative with its phase-epic hierarchy (VISION §18, §37).
 *
 * Level 1 (initiative) carries the primary icon and title; phases and epics
 * form levels 2 and 3.
 */
export const projectSchema = z.strictObject({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: iconIdSchema,
  status: projectStatusSchema,
  phases: z.array(phaseSchema),
});
export type Project = z.infer<typeof projectSchema>;
