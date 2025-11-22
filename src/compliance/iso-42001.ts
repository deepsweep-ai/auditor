import type { ComplianceChecker, MCPSession, Finding, ComplianceStatus } from '../types/index.js';

// ISO/IEC 42001 - AI Management System
export class ISO42001Checker implements ComplianceChecker {
  name = 'ISO/IEC 42001';

  async check(session: MCPSession, findings: Finding[]): Promise<ComplianceStatus> {
    // ISO 42001 key requirements:
    // - Risk assessment and management
    // - Data governance
    // - AI system transparency
    // - Continuous monitoring
    // - Incident management

    const hasCriticalFindings = findings.some((f) => f.severity === 'CRITICAL');
    const hasHighFindings = findings.some((f) => f.severity === 'HIGH');
    const hasMediumFindings = findings.some((f) => f.severity === 'MEDIUM');

    const hasRiskManagement = this.checkRiskManagement(session);
    const hasDataGovernance = this.checkDataGovernance(session);
    const hasTransparency = this.checkTransparency(session);
    const hasMonitoring = this.checkMonitoring(session);
    const hasIncidentManagement = this.checkIncidentManagement(session);

    if (hasCriticalFindings) {
      return 'FAIL';
    }

    const passedChecks = [
      hasRiskManagement,
      hasDataGovernance,
      hasTransparency,
      hasMonitoring,
      hasIncidentManagement,
    ].filter(Boolean).length;

    if (hasHighFindings || passedChecks < 3) {
      return 'FAIL';
    }

    if (hasMediumFindings || passedChecks < 5) {
      return 'PARTIAL';
    }

    return 'PASS';
  }

  private checkRiskManagement(session: MCPSession): boolean {
    return !!(
      session.metadata?.risk_assessment ||
      session.metadata?.risk_management ||
      session.metadata?.threat_model
    );
  }

  private checkDataGovernance(session: MCPSession): boolean {
    return !!(
      session.metadata?.data_governance ||
      session.metadata?.data_policy ||
      session.metadata?.data_classification
    );
  }

  private checkTransparency(session: MCPSession): boolean {
    return !!(
      session.metadata?.documentation ||
      session.metadata?.explainability ||
      session.metadata?.transparency
    );
  }

  private checkMonitoring(session: MCPSession): boolean {
    return !!(
      session.metadata?.monitoring ||
      session.metadata?.logging ||
      session.metadata?.audit_trail
    );
  }

  private checkIncidentManagement(session: MCPSession): boolean {
    return !!(
      session.metadata?.incident_response ||
      session.metadata?.incident_management ||
      session.metadata?.incident_plan
    );
  }
}
