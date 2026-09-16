import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { composePresentation } from '../src/composition/index.js';
import { validatePresentation } from '../src/validation/validate-presentation.js';

const SAMPLES = fileURLToPath(new URL('../samples/', import.meta.url));

function loadPresentation(name: string) {
  const input = JSON.parse(readFileSync(`${SAMPLES}${name}.json`, 'utf8')) as unknown;
  return validatePresentation(input).presentation;
}

describe('composePresentation', () => {
  it('expands the full fixture in exact narrative order', () => {
    const presentation = loadPresentation('full-sprint');
    const slides = composePresentation(presentation);

    expect(slides.map(({ archetype }) => archetype)).toEqual([
      'title',
      'themes',
      'metrics-overview',
      'metric-selected',
      'metric-detail',
      'metric-selected',
      'metric-detail',
      'metric-selected',
      'metric-detail',
      'metric-selected',
      'metric-detail',
      'project-status',
      'release',
      'deprecation',
      'advisory',
      'roadmap',
      'sprint-summary',
    ]);

    expect(
      slides
        .filter((slide) => slide.archetype === 'metric-selected')
        .map((slide) => slide.data.selectedMetric),
    ).toEqual(['delivery-confidence', 'quality', 'adoption', 'operational-health']);
    expect(
      slides
        .filter((slide) => slide.archetype === 'metric-detail')
        .map((slide) => slide.data[0].metric),
    ).toEqual(['delivery-confidence', 'quality', 'adoption', 'operational-health']);
  });

  it('matches the VISION §37 to §38 expansion with empty sections omitted', () => {
    const presentation = loadPresentation('full-sprint');
    presentation.releases = [];
    presentation.deprecations = [];
    presentation.advisories = [];
    presentation.roadmap = [];

    expect(composePresentation(presentation).map(({ archetype }) => archetype)).toEqual([
      'title',
      'themes',
      'metrics-overview',
      'metric-selected',
      'metric-detail',
      'metric-selected',
      'metric-detail',
      'metric-selected',
      'metric-detail',
      'metric-selected',
      'metric-detail',
      'project-status',
      'sprint-summary',
    ]);
  });

  it('omits every empty content section while retaining the opening and closing slides', () => {
    const slides = composePresentation(loadPresentation('minimal'));
    expect(slides.map(({ archetype }) => archetype)).toEqual(['title', 'sprint-summary']);
  });

  it('returns structurally identical instructions for identical input', () => {
    const presentation = loadPresentation('full-sprint');
    expect(composePresentation(presentation)).toEqual(composePresentation(presentation));
  });

  it('deterministically splits a valid dense project into continuation slides', () => {
    const presentation = loadPresentation('minimal');
    presentation.projects.push({
      id: 'dense-project',
      title: 'Dense Project',
      icon: 'project',
      status: 'on-track',
      phases: Array.from({ length: 3 }, (_, phaseIndex) => ({
        title: `Phase ${phaseIndex + 1}`,
        icon: 'phase',
        epics: Array.from({ length: 4 }, (_, epicIndex) => ({
          title: `Epic ${epicIndex + 1}`,
        })),
      })),
    });

    const projects = composePresentation(presentation).filter(
      (slide) => slide.archetype === 'project-status',
    );
    expect(projects.map((slide) => slide.data.title)).toEqual([
      'Dense Project',
      'Dense Project (continued)',
    ]);
    expect(projects.map((slide) => slide.data.phases.length)).toEqual([2, 1]);
  });

  it('does not mutate validated input', () => {
    const presentation = loadPresentation('full-sprint');
    const before = structuredClone(presentation);
    composePresentation(presentation);
    expect(presentation).toEqual(before);
  });
});
