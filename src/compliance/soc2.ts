import type { ComplianceChecker, MCPSession, Finding, ComplianceStatus } from '../types/index.js';

// SOC 2 Trust Service Criteria for AI systems
export class SOC2Checker implements ComplianceChecker {
  name = 'SOC 2 AI';

  async check(session: MCPSession, findings: Finding[]): Promise<ComplianceStatus> {
    // SOC 2 Trust Service Criteria:
    // - Security (CC6): System protected against unauthorized access
    // - Availability (A1): System available for operation and use
    // - Processing Integrity (PI1): System processing is complete, valid, accurate, timely
    // - Confidentiality (C1): Confidential information protected
    // - Privacy (P1): Personal information collected, used, retained, disclosed, and disposed

    const hasCriticalFindings = findings.some((f) => f.severity === 'CRITICAL');
    const hasHighFindings = findings.some((f) => f.severity === 'HIGH');

    // Check for specific SOC 2 violations
    const hasSecurityViolations = this.checkSecurityViolations(findings);
    const hasIntegrityViolations = this.checkIntegrityViolations(findings);
    const hasConfidentialityViolations = this.checkConfidentialityViolations(findings);

    const hasSecurityControls = this.checkSecurityControls(session);
    const hasAccessControls = this.checkAccessControls(session);
    const hasAuditLogging = this.checkAuditLogging(session);

    if (hasCriticalFindings || hasSecurityViolations) {
      return 'FAIL';
    }

    if (
      hasHighFindings ||
      hasIntegrityViolations ||
      hasConfidentialityViolations ||
      !hasSecurityControls ||
      !hasAccessControls
    ) {
      return 'PARTIAL';
    }

    if (!hasAuditLogging) {
      return 'PARTIAL';
    }

    return 'PASS';
  }

  private checkSecurityViolations(findings: Finding[]): boolean {
    // Check for security-related findings
    const securityKeywords = [
      'injection',
      'execution',
      'unauthorized',
      'malicious',
      'exploit',
      'shell',
      'command',
    ];

    return findings.some((f) => {
      const text = `${f.title} ${f.description}`.toLowerCase();
      return securityKeywords.some((kw) => text.includes(kw)) && f.severity === 'CRITICAL';
    });
  }

  private checkIntegrityViolations(findings: Finding[]): boolean {
    // Check for data integrity issues
    const integrityKeywords = ['poisoning', 'manipulation', 'tampering', 'corruption', 'drift'];

    return findings.some((f) => {
      const text = `${f.title} ${f.description}`.toLowerCase();
      return integrityKeywords.some((kw) => text.includes(kw));
    });
  }

  private checkConfidentialityViolations(findings: Finding[]): boolean {
    // Check for confidentiality issues
    const confidentialityKeywords = ['exfiltration', 'leak', 'exposure', 'disclosure'];

    return findings.some((f) => {
      const text = `${f.title} ${f.description}`.toLowerCase();
      return confidentialityKeywords.some((kw) => text.includes(kw));
    });
  }

  private checkSecurityControls(session: MCPSession): boolean {
    return !!(
      session.metadata?.security_controls ||
      session.metadata?.security_policy ||
      session.metadata?.encryption
    );
  }

  private checkAccessControls(session: MCPSession): boolean {
    return !!(
      session.metadata?.access_control ||
      session.metadata?.authentication ||
      session.metadata?.authorization
    );
  }

  private checkAuditLogging(session: MCPSession): boolean {
    return !!(
      session.metadata?.audit_log ||
      session.metadata?.logging ||
      session.metadata?.audit_trail
    );
  }
}
