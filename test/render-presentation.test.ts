import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';

import { renderPresentationFile } from '../src/render.js';

const SAMPLES_DIR = fileURLToPath(new URL('../samples', import.meta.url));

function normalizedPackageParts(bytes: Uint8Array): Readonly<Record<string, Uint8Array>> {
  const parts = unzipSync(bytes);
  const coreProperties = parts['docProps/core.xml'];
  if (coreProperties !== undefined) {
    const normalized = strFromU8(coreProperties).replace(
      /<dcterms:(created|modified)[^>]*>[^<]*<\/dcterms:\1>/g,
      '<dcterms:$1>normalized</dcterms:$1>',
    );
    parts['docProps/core.xml'] = Buffer.from(normalized);
  }
  return parts;
}

describe('renderPresentationFile', () => {
  const workDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(workDirectories.splice(0).map((path) => rm(path, { recursive: true })));
  });

  async function createWorkDirectory(): Promise<string> {
    const path = await mkdtemp(join(tmpdir(), 'pptx-presentation-'));
    workDirectories.push(path);
    return path;
  }

  it('renders the VISION §38 sequence with the expected content and icon relationships', async () => {
    const workDirectory = await createWorkDirectory();
    const outputPath = join(workDirectory, 'full-sprint.pptx');

    await expect(
      renderPresentationFile(join(SAMPLES_DIR, 'full-sprint.json'), outputPath),
    ).resolves.toBe(outputPath);

    const bytes = await readFile(outputPath);
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    const packageParts = unzipSync(bytes);
    const slideParts = Object.keys(packageParts)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((left, right) => Number(left.match(/\d+/)![0]) - Number(right.match(/\d+/)![0]));

    const expectedTextBySlide = [
      ['Sprint 42 Overview', 'Platform Engineering'],
      ['SPRINT THEMES', 'Foundation', 'Adoption', 'Reliability'],
      ['SPRINT HEALTH', 'Delivery', 'Quality', 'Adoption', 'Operational'],
      ['SPRINT HEALTH', 'Delivery', 'SELECTED', '92%'],
      ['DELIVERY CONFIDENCE', '92%'],
      ['SPRINT HEALTH', 'Quality', 'SELECTED', '87%'],
      ['QUALITY', '87%'],
      ['SPRINT HEALTH', 'Adoption', 'SELECTED', '64%'],
      ['ADOPTION', '64%', 'Pilot group expanded'],
      ['SPRINT HEALTH', 'Operational', 'SELECTED', '96%'],
      ['OPERATIONAL HEALTH', '96%'],
      ['Workspace Assistant Rollout', 'Pilot Expansion', 'Production Readiness'],
      ['New Analytics Experience', 'Available this sprint'],
      ['Legacy Report Export', 'October 31'],
      ['Authentication Change', 'Action required before September 15'],
      ['COMING NEXT', 'Improve pilot telemetry', 'Expand availability'],
      ['Sprint 42', 'Overall sprint health needs attention'],
    ];

    expect(slideParts).toHaveLength(expectedTextBySlide.length);
    slideParts.forEach((partName, index) => {
      const xml = strFromU8(packageParts[partName]!);
      for (const label of expectedTextBySlide[index]!) expect(xml).toContain(label);

      // Every archetype uses semantic SVG imagery; content slides also carry
      // product identity in the application header (VISION §36.3, §36.4, §36.8).
      const relationships = strFromU8(packageParts[`ppt/slides/_rels/slide${index + 1}.xml.rels`]!);
      expect(relationships).toContain('../media/image');
      if (index > 0) expect(relationships.match(/\.\.\/media\/image/g)?.length).toBeGreaterThan(1);
    });
  });

  it('rejects invalid input without creating a partial output file', async () => {
    const workDirectory = await createWorkDirectory();
    const outputPath = join(workDirectory, 'nested', 'invalid.pptx');

    await expect(
      renderPresentationFile(join(SAMPLES_DIR, 'invalid-over-limit-themes.json'), outputPath),
    ).rejects.toThrow('Slide archetype: themes');
    await expect(stat(outputPath)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('renders structurally identical packages for identical input', async () => {
    const workDirectory = await createWorkDirectory();
    const inputPath = join(SAMPLES_DIR, 'full-sprint.json');
    const firstOutputPath = join(workDirectory, 'first.pptx');
    const secondOutputPath = join(workDirectory, 'second.pptx');

    await renderPresentationFile(inputPath, firstOutputPath);
    await renderPresentationFile(inputPath, secondOutputPath);

    const firstParts = normalizedPackageParts(await readFile(firstOutputPath));
    const secondParts = normalizedPackageParts(await readFile(secondOutputPath));
    const firstNames = Object.keys(firstParts).sort();
    const secondNames = Object.keys(secondParts).sort();

    expect(secondNames).toEqual(firstNames);
    for (const name of firstNames) {
      expect(secondParts[name], `Package part differs: ${name}`).toEqual(firstParts[name]);
    }
  });
});
