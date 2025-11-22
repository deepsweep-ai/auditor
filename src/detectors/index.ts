export * from './memory/index.js';
export * from './tools/index.js';

import { getAllMemoryDetectors } from './memory/index.js';
import { getAllToolDetectors } from './tools/index.js';
import type { Detector } from '../types/index.js';

export function getAllDetectors(): Detector[] {
  return [...getAllMemoryDetectors(), ...getAllToolDetectors()];
}
