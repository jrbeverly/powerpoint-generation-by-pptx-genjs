import type { MetricEntry } from '../schema/metrics.js';
import type {
  Advisory,
  Deprecation,
  Presentation,
  Release,
  RoadmapItem,
  Theme,
} from '../schema/presentation.js';
import type { Project } from '../schema/projects.js';
import type { Status } from '../schema/common.js';
import type { MetricSelection } from '../archetypes/metric-selected.js';
import type { SprintOverview } from '../archetypes/title.js';
import type { SprintSummary } from '../archetypes/sprint-summary.js';
import { Layout } from '../theme/layout.js';
import { Spacing } from '../theme/spacing.js';
import { Typography } from '../theme/typography.js';

/** A render-ready instruction emitted by the presentation compiler. */
export type SlideInstruction =
  | { archetype: 'title'; data: SprintOverview }
  | { archetype: 'themes'; data: readonly Theme[] }
  | { archetype: 'metrics-overview'; data: readonly MetricEntry[] }
  | { archetype: 'metric-selected'; data: MetricSelection }
  | { archetype: 'metric-detail'; data: readonly [MetricEntry] }
  | { archetype: 'project-status'; data: Project }
  | { archetype: 'release'; data: Release }
  | { archetype: 'deprecation'; data: Deprecation }
  | { archetype: 'advisory'; data: Advisory }
  | { archetype: 'roadmap'; data: readonly RoadmapItem[] }
  | { archetype: 'sprint-summary'; data: SprintSummary };

const STATUS_PRIORITY: Readonly<Record<Status, number>> = {
  blocked: 5,
  attention: 4,
  healthy: 3,
  upcoming: 2,
  complete: 1,
};

function overallStatus(presentation: Presentation): Status {
  const statuses: Status[] = presentation.metrics.flatMap((metric) =>
    metric.status === undefined ? [] : [metric.status],
  );
  for (const project of presentation.projects) {
    statuses.push(
      project.status === 'blocked'
        ? 'blocked'
        : project.status === 'at-risk'
          ? 'attention'
          : project.status === 'complete'
            ? 'complete'
            : 'healthy',
    );
  }
  return statuses.reduce(
    (result, status) => (STATUS_PRIORITY[status] > STATUS_PRIORITY[result] ? status : result),
    'healthy',
  );
}

/**
 * The v1 schema has no explicit closing-summary fields. Derive a concise,
 * reproducible endpoint from the first applicable semantic item in each
 * category. The priority is intentionally fixed and input order is preserved.
 */
function composeSprintSummary(presentation: Presentation): SprintSummary {
  const release = presentation.releases[0];
  const project = presentation.projects[0];
  const theme = presentation.themes[0];
  const roadmapItem =
    presentation.roadmap.find((item) => item.horizon === 'next') ?? presentation.roadmap[0];
  const deprecation = presentation.deprecations[0];
  const advisory = presentation.advisories[0];
  const status = overallStatus(presentation);

  const keyAccomplishment = release
    ? { icon: 'release', text: release.title }
    : project
      ? { icon: project.icon, text: project.title }
      : theme
        ? { icon: theme.icon, text: theme.title }
        : { icon: 'complete', text: `${presentation.sprint} complete` };

  const majorUpcomingItem = roadmapItem
    ? { icon: 'roadmap', text: roadmapItem.title }
    : deprecation
      ? { icon: 'deprecation', text: deprecation.title }
      : advisory
        ? { icon: 'advisory', text: advisory.title }
        : { icon: 'upcoming', text: 'Next sprint planning' };

  const statusText: Readonly<Record<Status, string>> = {
    healthy: 'Overall sprint health is healthy',
    attention: 'Overall sprint health needs attention',
    blocked: 'Overall sprint health is blocked',
    complete: 'Overall sprint work is complete',
    upcoming: 'Overall sprint work is upcoming',
  };

  return {
    sprint: presentation.sprint,
    keyAccomplishment,
    overallState: { status, text: statusText[status] },
    majorUpcomingItem,
  };
}

function phaseHeight(project: Project, phaseIndex: number): number {
  const phase = project.phases[phaseIndex]!;
  const headingHeight = (Typography.scale.h3 / 72) * Typography.lineSpacing.loose;
  if (phase.epics.length === 0) return headingHeight;

  const epicHeight = (Typography.scale.body / 72) * Typography.lineSpacing.loose;
  return headingHeight + Spacing.sm + phase.epics.length * (epicHeight + Spacing.xs) - Spacing.xs;
}

/** Split only projects whose valid content cannot fit the fixed v1 layout. */
function splitProject(project: Project): readonly Project[] {
  const availableHeight = Layout.content.bottom - Layout.content.top;
  const chunks: Project['phases'][] = [];
  let phases: Project['phases'] = [];
  let usedHeight = Spacing.md;

  project.phases.forEach((phase, index) => {
    const height = phaseHeight(project, index);
    const gap = phases.length === 0 ? 0 : Spacing.lg;
    if (phases.length > 0 && usedHeight + gap + height > availableHeight) {
      chunks.push(phases);
      phases = [];
      usedHeight = Spacing.md;
    }
    phases.push(phase);
    usedHeight += (phases.length === 1 ? 0 : Spacing.lg) + height;
  });
  chunks.push(phases);

  if (chunks.length === 1) return [project];
  return chunks.map((chunk, index) => ({
    ...project,
    title: index === 0 ? project.title : `${project.title} (continued)`,
    phases: chunk,
  }));
}

/**
 * Expands an already validated presentation into its deterministic narrative
 * sequence (VISION §11, §16, §26, §38).
 *
 * Empty content sections are omitted. Input arrays are never sorted or
 * mutated: their validated semantic order is the presentation order.
 */
export function composePresentation(presentation: Presentation): readonly SlideInstruction[] {
  const slides: SlideInstruction[] = [
    {
      archetype: 'title',
      data: {
        title: presentation.title,
        ...(presentation.subtitle === undefined ? {} : { subtitle: presentation.subtitle }),
        ...(presentation.dateRange === undefined ? {} : { dateRange: presentation.dateRange }),
      },
    },
  ];

  if (presentation.themes.length > 0) {
    slides.push({ archetype: 'themes', data: presentation.themes });
  }

  if (presentation.metrics.length > 0) {
    slides.push({ archetype: 'metrics-overview', data: presentation.metrics });
    for (const metric of presentation.metrics) {
      slides.push({
        archetype: 'metric-selected',
        data: { metrics: presentation.metrics, selectedMetric: metric.metric },
      });
      slides.push({ archetype: 'metric-detail', data: [metric] });
    }
  }

  for (const project of presentation.projects) {
    for (const projectSlide of splitProject(project)) {
      slides.push({ archetype: 'project-status', data: projectSlide });
    }
  }
  for (const release of presentation.releases) {
    slides.push({ archetype: 'release', data: release });
  }
  for (const deprecation of presentation.deprecations) {
    slides.push({ archetype: 'deprecation', data: deprecation });
  }
  for (const advisory of presentation.advisories) {
    slides.push({ archetype: 'advisory', data: advisory });
  }
  if (presentation.roadmap.length > 0) {
    slides.push({ archetype: 'roadmap', data: presentation.roadmap });
  }

  slides.push({ archetype: 'sprint-summary', data: composeSprintSummary(presentation) });
  return slides;
}
