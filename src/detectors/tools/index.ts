export { BroadPermissionsDetector } from './broad-permissions.js';
export { RuntimeAdditionsDetector } from './runtime-additions.js';
export { SuspiciousParametersDetector } from './suspicious-parameters.js';

import { BroadPermissionsDetector } from './broad-permissions.js';
import { RuntimeAdditionsDetector } from './runtime-additions.js';
import { SuspiciousParametersDetector } from './suspicious-parameters.js';
import type { Detector } from '../../types/index.js';

export function getAllToolDetectors(): Detector[] {
  return [
    new BroadPermissionsDetector(),
    new RuntimeAdditionsDetector(),
    new SuspiciousParametersDetector(),
  ];
}
