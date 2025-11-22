export { RecursiveInstructionsDetector } from './recursive-instructions.js';
export { PersistentOverridesDetector } from './persistent-overrides.js';
export { EncodedInjectionsDetector } from './encoded-injections.js';
export { MaliciousSignaturesDetector } from './malicious-signatures.js';
export { EntropyAnomalyDetector } from './entropy-anomaly.js';
export { GoalDriftDetector } from './goal-drift.js';

import { RecursiveInstructionsDetector } from './recursive-instructions.js';
import { PersistentOverridesDetector } from './persistent-overrides.js';
import { EncodedInjectionsDetector } from './encoded-injections.js';
import { MaliciousSignaturesDetector } from './malicious-signatures.js';
import { EntropyAnomalyDetector } from './entropy-anomaly.js';
import { GoalDriftDetector } from './goal-drift.js';
import type { Detector } from '../../types/index.js';

export function getAllMemoryDetectors(): Detector[] {
  return [
    new RecursiveInstructionsDetector(),
    new PersistentOverridesDetector(),
    new EncodedInjectionsDetector(),
    new MaliciousSignaturesDetector(),
    new EntropyAnomalyDetector(),
    new GoalDriftDetector(),
  ];
}
