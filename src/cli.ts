#!/usr/bin/env node
import { resolve } from 'node:path';

import { renderPresentationFile } from './render.js';

export async function runCli(args: readonly string[]): Promise<number> {
  if (args.length !== 2) {
    console.error('Usage: render <input.json> <output.pptx>');
    return 2;
  }

  const [inputPath, outputPath] = args;
  try {
    const written = await renderPresentationFile(resolve(inputPath!), resolve(outputPath!));
    console.log(`Wrote ${written}`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

process.exitCode = await runCli(process.argv.slice(2));
