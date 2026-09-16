import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { renderHelloWorld } from '../src/render.js';

/** Local file header signature of a ZIP archive ("PK\x03\x04"). */
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

describe('renderHelloWorld', () => {
  let workDir: string;
  let pptxPath: string;
  let bytes: Buffer;

  beforeAll(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'pptx-hello-world-'));
    pptxPath = join(workDir, 'hello-world.pptx');
    await renderHelloWorld(pptxPath);
    bytes = await readFile(pptxPath);
  });

  afterAll(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('writes a non-trivial .pptx file', () => {
    expect(bytes.length).toBeGreaterThan(1024);
  });

  it('produces a ZIP/OPC package', () => {
    expect(bytes.subarray(0, 4)).toEqual(ZIP_MAGIC);
  });

  it('contains the core PowerPoint XML parts', () => {
    // ZIP stores entry names verbatim in each local file header.
    const listing = bytes.toString('latin1');
    expect(listing).toContain('[Content_Types].xml');
    expect(listing).toContain('ppt/presentation.xml');
    expect(listing).toContain('ppt/slides/slide1.xml');
  });

  it('renders exactly one slide', () => {
    const listing = bytes.toString('latin1');
    expect(listing).not.toContain('ppt/slides/slide2.xml');
  });
});
