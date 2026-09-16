import type pptxgen from 'pptxgenjs';

import { addApplicationHeader, addPhase } from '../components/index.js';
import { PROJECT_STATUS_CONSTRAINTS } from '../constraints/archetypes.js';
import type { ProjectStatus, Status } from '../schema/common.js';
import type { Project } from '../schema/projects.js';
import type { RenderContext } from '../theme/context.js';

import type { ArchetypeRenderer } from './types.js';

/**
 * Initiative status mapped onto the status-icon vocabulary (VISION §8, §39).
 *
 * Project status is a sibling of the shared `Status` vocabulary rather than
 * an extension of it (VISION §18, §37): the JSON names the initiative state
 * semantically and the renderer picks the status artwork, so "on-track"
 * shares the healthy indicator and "at-risk" the attention indicator.
 */
const PROJECT_STATUS_INDICATOR: Record<ProjectStatus, Status> = {
  'on-track': 'healthy',
  'at-risk': 'attention',
  blocked: 'blocked',
  complete: 'complete',
};

/**
 * Renders one initiative as a project-status slide (VISION §18):
 *
 * - Level 1 — application-like header with the project icon, the initiative
 *   title, and the mapped status indicator (VISION §10, §18);
 * - Level 2 — one phase / workstream block per phase via `addPhase`;
 * - Level 3 — epic lines inside each phase via `addEpic` (through `addPhase`).
 *
 * Exactly one initiative per slide (VISION §19): the composition layer calls
 * this once per project. Phase blocks stack in a single column so epic titles
 * keep the full content-column width (VISION §18, §30).
 *
 * Enforces {@link PROJECT_STATUS_CONSTRAINTS} loudly (VISION §30, §31): more
 * than four phases, more than five epics per phase, epic titles beyond the
 * length cap, or content that cannot fit the slide's content region throw
 * before a deck can be produced — overflow is an input validation problem,
 * not a typography problem, and the renderer never shrinks fonts.
 * The composition layer deterministically splits otherwise-valid dense
 * initiatives into continuation slides before calling this renderer.
 */
export const addProjectStatusSlide: ArchetypeRenderer<Project> = (
  pptx: pptxgen,
  ctx: RenderContext,
  project: Project,
): void => {
  const c = PROJECT_STATUS_CONSTRAINTS;

  // Loud pre-checks before any shape is drawn (VISION §30, §31).
  if (project.phases.length > c.phases.max) {
    throw new Error(
      `addProjectStatusSlide supports at most ${c.phases.max} phases per initiative, ` +
        `got ${project.phases.length} for "${project.title}". Split the initiative across ` +
        'continuation slides at the composition layer — overflow is an input validation ' +
        'problem, not a typography problem (VISION §30).',
    );
  }
  for (const phase of project.phases) {
    if (phase.epics.length > c.epicsPerPhase.max) {
      throw new Error(
        `addProjectStatusSlide supports at most ${c.epicsPerPhase.max} epics per phase, ` +
          `got ${phase.epics.length} for "${phase.title}". Split the phase at the epic level — ` +
          'overflow is an input validation problem, not a typography problem (VISION §30).',
      );
    }
    for (const epic of phase.epics) {
      if (epic.title.length > c.epicTitleLength.max) {
        throw new Error(
          `addProjectStatusSlide supports epic titles up to ${c.epicTitleLength.max} characters, ` +
            `got ${epic.title.length} for "${epic.title}" in phase "${phase.title}". Shorten the ` +
            'epic title — overflow is an input validation problem, not a typography problem ' +
            '(VISION §30).',
        );
      }
    }
    // addPhase re-checks the epic cap defensively before drawing (VISION §30).
  }

  const { layout: L, spacing: S, colors: C } = ctx;

  const slide = pptx.addSlide();
  slide.background = { color: C.backgroundDark };

  // Level 1 — initiative identity and state (VISION §10, §18).
  addApplicationHeader(pptx, slide, ctx, {
    icon: project.icon,
    title: project.title,
    status: PROJECT_STATUS_INDICATOR[project.status],
  });

  // Levels 2 and 3 — phase blocks with their epics, stacked in one column.
  const width = L.content.right - L.content.left;
  let y = L.content.top + S.md;
  project.phases.forEach((phase, index) => {
    if (index > 0) {
      y += S.lg;
    }
    y += addPhase(slide, ctx, phase, { x: L.content.left, y, width });
  });

  // Fit check (VISION §31): within-limit content can still exceed the content
  // region (e.g. many dense phases), and the renderer must never silently run
  // off the slide.
  if (y > L.content.bottom) {
    const used = y - L.content.top;
    const available = L.content.bottom - L.content.top;
    throw new Error(
      `Project status content for "${project.title}" overflows the slide content region: ` +
        `${used.toFixed(2)}" of content exceeds the ${available.toFixed(2)}" available. Reduce ` +
        'phases/epics in the input or split the initiative across continuation slides — ' +
        'split the initiative across deterministic continuation slides (VISION §30, §31).',
    );
  }
};
