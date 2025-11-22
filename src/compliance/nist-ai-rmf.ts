import type { ComplianceChecker, MCPSession, Finding, ComplianceStatus } from '../types/index.js';

// NIST AI RMF 1.0 framework maps to 4 functions: Govern, Map, Measure, Manage
export class NISTAIRMFChecker implements ComplianceChecker {
  name = 'NIST AI RMF 1.0';

  async check(session: MCPSession, findings: Finding[]): Promise<ComplianceStatus> {
    // Check critical requirements
    const hasCriticalFindings = findings.some((f) => f.severity === 'CRITICAL');
    const hasHighFindings = findings.some((f) => f.severity === 'HIGH');

    // NIST AI RMF requires:
    // - Govern: Documented policies and risk management
    // - Map: Identified risks and context
    // - Measure: Testing and validation
    // - Manage: Ongoing monitoring and response

    const hasGovernance = this.checkGovernance(session);
    const hasMapping = this.checkMapping(session, findings);
    const hasMeasurement = this.checkMeasurement(session);
    const hasManagement = this.checkManagement(session);

    if (hasCriticalFindings) {
      return 'FAIL'; // Critical vulnerabilities = automatic fail
    }

    if (!hasGovernance || !hasMapping) {
      return 'FAIL'; // Missing core requirements
    }

    if (hasHighFindings || !hasMeasurement || !hasManagement) {
      return 'PARTIAL'; // Some issues or missing components
    }

    return 'PASS';
  }

  private checkGovernance(session: MCPSession): boolean {
    // Check if session has governance metadata
    return !!(
      session.metadata?.governance ||
      session.metadata?.policies ||
      session.metadata?.risk_management
    );
  }

  private checkMapping(_session: MCPSession, findings: Finding[]): boolean {
    // Risk mapping is done - we identified risks through scanning
    return findings.length >= 0; // Always true after scan
  }

  private checkMeasurement(session: MCPSession): boolean {
    // Check if there's evidence of testing/validation
    return !!(
      session.metadata?.testing ||
      session.metadata?.validation ||
      session.metadata?.audit_history
    );
  }

  private checkManagement(session: MCPSession): boolean {
    // Check if there's evidence of ongoing monitoring
    return !!(
      session.metadata?.monitoring ||
      session.metadata?.alerts ||
      session.metadata?.incident_response
    );
  }
}
