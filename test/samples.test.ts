import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
  CatalogViolation,
  ConstraintViolation,
} from '../src/validation/validate-presentation.js';
import {
  PresentationValidationError,
  validatePresentation,
} from '../src/validation/validate-presentation.js';

const SAMPLES_DIR = fileURLToPath(new URL('../samples', import.meta.url));

function loadSample(name: string): unknown {
  return JSON.parse(readFileSync(join(SAMPLES_DIR, `${name}.json`), 'utf-8')) as unknown;
}

// ---------------------------------------------------------------------------
// Valid samples — must pass validatePresentation without throwing
// ---------------------------------------------------------------------------

describe('samples — valid fixtures pass validation', () => {
  const VALID = [
    'full-sprint',
    'metrics-only',
    'projects-only',
    'notices-only',
    'roadmap-only',
    'minimal',
  ] as const;

  for (const name of VALID) {
    it(`${name}.json passes validatePresentation`, () => {
      expect(() => validatePresentation(loadSample(name))).not.toThrow();
    });
  }

  it('full-sprint.json returns a parsed document with all sections', () => {
    const doc = validatePresentation(loadSample('full-sprint'));
    expect(doc.version).toBe('1.0');
    const p = doc.presentation;
    expect(p.themes).toHaveLength(3);
    expect(p.metrics).toHaveLength(4);
    expect(p.projects).toHaveLength(1);
    expect(p.releases).toHaveLength(1);
    expect(p.deprecations).toHaveLength(1);
    expect(p.advisories).toHaveLength(1);
    expect(p.roadmap).toHaveLength(3);
  });

  it('minimal.json has all sections empty (exercises section omission)', () => {
    const doc = validatePresentation(loadSample('minimal'));
    const p = doc.presentation;
    expect(p.themes).toHaveLength(0);
    expect(p.metrics).toHaveLength(0);
    expect(p.projects).toHaveLength(0);
    expect(p.releases).toHaveLength(0);
    expect(p.deprecations).toHaveLength(0);
    expect(p.advisories).toHaveLength(0);
    expect(p.roadmap).toHaveLength(0);
  });

  it('roadmap-only.json exercises the maximum roadmap item count (6)', () => {
    const doc = validatePresentation(loadSample('roadmap-only'));
    expect(doc.presentation.roadmap).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Invalid samples — must fail with the expected error types
// ---------------------------------------------------------------------------

describe('samples — invalid fixtures fail validation', () => {
  it('invalid-unknown-product.json — catalog violation: unknown product id', () => {
    try {
      validatePresentation(loadSample('invalid-unknown-product'));
      expect.unreachable('expected PresentationValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(PresentationValidationError);
      const e = err as PresentationValidationError;
      expect(e.violations[0]).toMatchObject({
        kind: 'catalog',
        archetype: 'presentation',
        catalogName: 'product id',
        unknownValue: 'not-a-product',
      } satisfies Partial<CatalogViolation>);
    }
  });

  it('invalid-unknown-icon.json — catalog violation: unknown icon id in theme', () => {
    try {
      validatePresentation(loadSample('invalid-unknown-icon'));
      expect.unreachable('expected PresentationValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(PresentationValidationError);
      const e = err as PresentationValidationError;
      expect(e.violations[0]).toMatchObject({
        kind: 'catalog',
        archetype: 'themes',
        contextLines: [['Theme', 'Alpha']],
        catalogName: 'icon id',
        unknownValue: 'not-an-icon',
      } satisfies Partial<CatalogViolation>);
    }
  });

  it('invalid-unknown-metric.json — ZodError: metric id not in schema enum (Stage 1)', () => {
    expect(() => validatePresentation(loadSample('invalid-unknown-metric'))).toThrow(z.ZodError);
  });

  it('invalid-over-limit-epics.json — constraint violation: too many epics in a phase', () => {
    try {
      validatePresentation(loadSample('invalid-over-limit-epics'));
      expect.unreachable('expected PresentationValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(PresentationValidationError);
      const e = err as PresentationValidationError;
      expect(e.violations[0]).toMatchObject({
        kind: 'constraint',
        archetype: 'project-status',
        contextLines: [
          ['Initiative', 'Overloaded Initiative'],
          ['Phase', 'Phase One'],
        ],
        constraintLabel: 'Maximum epics',
        received: 6,
      } satisfies Partial<ConstraintViolation>);
    }
  });

  it('invalid-over-limit-themes.json — constraint violation: theme count above maximum', () => {
    try {
      validatePresentation(loadSample('invalid-over-limit-themes'));
      expect.unreachable('expected PresentationValidationError');
    } catch (err) {
      expect(err).toBeInstanceOf(PresentationValidationError);
      const e = err as PresentationValidationError;
      expect(e.violations[0]).toMatchObject({
        kind: 'constraint',
        archetype: 'themes',
        constraintLabel: 'Maximum themes',
        received: 4,
      } satisfies Partial<ConstraintViolation>);
    }
  });
});
