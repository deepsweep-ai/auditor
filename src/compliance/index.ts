export { NISTAIRMFChecker } from './nist-ai-rmf.js';
export { ISO42001Checker } from './iso-42001.js';
export { SOC2Checker } from './soc2.js';
export { EUAIActChecker } from './eu-ai-act.js';

import { NISTAIRMFChecker } from './nist-ai-rmf.js';
import { ISO42001Checker } from './iso-42001.js';
import { SOC2Checker } from './soc2.js';
import { EUAIActChecker } from './eu-ai-act.js';
import type { MCPSession, Finding, ComplianceResults } from '../types/index.js';

export async function runComplianceChecks(
  session: MCPSession,
  findings: Finding[]
): Promise<ComplianceResults> {
  const nist = new NISTAIRMFChecker();
  const iso = new ISO42001Checker();
  const soc2 = new SOC2Checker();
  const euAiAct = new EUAIActChecker();

  const [nistResult, isoResult, soc2Result, euResult] = await Promise.all([
    nist.check(session, findings),
    iso.check(session, findings),
    soc2.check(session, findings),
    euAiAct.check(session, findings),
  ]);

  return {
    nist_ai_rmf: nistResult,
    iso_42001: isoResult,
    soc2_ai: soc2Result,
    eu_ai_act_high_risk: euResult,
  };
}
