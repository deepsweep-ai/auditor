import type { ComplianceChecker, MCPSession, Finding, ComplianceStatus } from '../types/index.js';

// EU AI Act - High-Risk AI Systems Requirements
export class EUAIActChecker implements ComplianceChecker {
  name = 'EU AI Act High-Risk';

  async check(session: MCPSession, findings: Finding[]): Promise<ComplianceStatus> {
    // EU AI Act requirements for high-risk systems:
    // - Risk management system
    // - Data governance and management
    // - Technical documentation
    // - Record-keeping
    // - Transparency and information to users
    // - Human oversight
    // - Accuracy, robustness, and cybersecurity

    const hasCriticalFindings = findings.some((f) => f.severity === 'CRITICAL');
    const hasHighFindings = findings.some((f) => f.severity === 'HIGH');

    // Check critical requirements
    const hasRiskManagement = this.checkRiskManagement(session);
    const hasDataGovernance = this.checkDataGovernance(session);
    const hasDocumentation = this.checkDocumentation(session);
    const hasRecordKeeping = this.checkRecordKeeping(session);
    const hasTransparency = this.checkTransparency(session);
    const hasHumanOversight = this.checkHumanOversight(session);
    const hasCybersecurity = this.checkCybersecurity(session, findings);

    if (hasCriticalFindings || !hasCybersecurity) {
      return 'FAIL'; // Critical vulnerabilities = not secure
    }

    const passedChecks = [
      hasRiskManagement,
      hasDataGovernance,
      hasDocumentation,
      hasRecordKeeping,
      hasTransparency,
      hasHumanOversight,
    ].filter(Boolean).length;

    if (hasHighFindings || passedChecks < 4) {
      return 'FAIL';
    }

    if (passedChecks < 6) {
      return 'PARTIAL';
    }

    return 'PASS';
  }

  private checkRiskManagement(session: MCPSession): boolean {
    return !!(
      session.metadata?.risk_management ||
      session.metadata?.risk_assessment ||
      session.metadata?.risk_mitigation
    );
  }

  private checkDataGovernance(session: MCPSession): boolean {
    return !!(
      session.metadata?.data_governance ||
      session.metadata?.data_quality ||
      session.metadata?.training_data
    );
  }

  private checkDocumentation(session: MCPSession): boolean {
    return !!(
      session.metadata?.documentation ||
      session.metadata?.technical_documentation ||
      session.metadata?.system_description
    );
  }

  private checkRecordKeeping(session: MCPSession): boolean {
    return !!(
      session.metadata?.logging ||
      session.metadata?.audit_trail ||
      session.metadata?.record_keeping
    );
  }

  private checkTransparency(session: MCPSession): boolean {
    return !!(
      session.metadata?.transparency ||
      session.metadata?.explainability ||
      session.metadata?.user_information
    );
  }

  private checkHumanOversight(session: MCPSession): boolean {
    return !!(
      session.metadata?.human_oversight ||
      session.metadata?.human_in_the_loop ||
      session.metadata?.review_process
    );
  }

  private checkCybersecurity(session: MCPSession, findings: Finding[]): boolean {
    // If there are critical security findings, cybersecurity is not adequate
    const hasCriticalSecurity = findings.some(
      (f) =>
        f.severity === 'CRITICAL' &&
        (f.category === 'memory_poisoning' || f.category === 'tool_poisoning')
    );

    if (hasCriticalSecurity) {
      return false;
    }

    // Check for security controls
    return !!(
      session.metadata?.cybersecurity ||
      session.metadata?.security_measures ||
      session.metadata?.security_controls
    );
  }
}
