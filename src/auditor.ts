import type {
  MCPConnection,
  MCPSession,
  Finding,
  AuditReport,
  MCPServerConfig,
} from './types/index.js';
import { createConnector } from './connectors/index.js';
import { getAllDetectors } from './detectors/index.js';
import { runComplianceChecks } from './compliance/index.js';
import { generateAuditId, calculateRiskScore, getRiskLevel } from './utils/helpers.js';

export class Auditor {
  private config: MCPServerConfig;
  private connector?: MCPConnection;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async audit(): Promise<AuditReport> {
    // 1. Connect to MCP server
    this.connector = createConnector(this.config);
    await this.connector.connect();

    // 2. Get session data
    const session: MCPSession = await this.connector.getSession();

    // 3. Run all detectors
    const detectors = getAllDetectors();
    const allFindings: Finding[] = [];

    for (const detector of detectors) {
      try {
        const findings = await detector.detect(session);
        allFindings.push(...findings);
      } catch (error) {
        console.error(`Detector ${detector.name} failed:`, error);
        // Continue with other detectors
      }
    }

    // 4. Run compliance checks
    const compliance = await runComplianceChecks(session, allFindings);

    // 5. Calculate risk score
    const criticalCount = allFindings.filter((f) => f.severity === 'CRITICAL').length;
    const highCount = allFindings.filter((f) => f.severity === 'HIGH').length;
    const mediumCount = allFindings.filter((f) => f.severity === 'MEDIUM').length;
    const lowCount = allFindings.filter((f) => f.severity === 'LOW').length;

    const riskScore = calculateRiskScore(criticalCount, highCount, mediumCount, lowCount);
    const overallRisk = getRiskLevel(riskScore);

    // 6. Generate recommendations
    const recommendations = this.generateRecommendations(allFindings, compliance);

    // 7. Disconnect
    await this.connector.disconnect();

    // 8. Build report
    const report: AuditReport = {
      audit_id: generateAuditId(),
      version: '0.2.0',
      timestamp: new Date().toISOString(),
      mcp_server_url: this.config.url || this.config.file || 'local',
      overall_risk: overallRisk,
      risk_score_0_100: riskScore,
      findings_count: allFindings.length,
      critical_findings: criticalCount,
      memory_poisoning_detected: allFindings.some((f) => f.category === 'memory_poisoning'),
      tool_poisoning_detected: allFindings.some((f) => f.category === 'tool_poisoning'),
      compliance,
      findings: allFindings,
      recommendations,
      deepsweep_promo: `Prevent these attacks automatically → https://platform.deepsweep.ai?ref=cli&risk=${overallRisk.toLowerCase()}`,
    };

    return report;
  }

  private generateRecommendations(
    findings: Finding[],
    compliance: any
  ): string[] {
    const recommendations: string[] = [];

    // Critical findings recommendations
    const criticalFindings = findings.filter((f) => f.severity === 'CRITICAL');
    if (criticalFindings.length > 0) {
      recommendations.push(
        `Immediate: Address ${criticalFindings.length} critical security vulnerabilities before deploying to production`
      );

      // Memory poisoning specific
      if (criticalFindings.some((f) => f.category === 'memory_poisoning')) {
        recommendations.push('Immediate: Implement input validation and sanitization for all memory writes');
        recommendations.push('Immediate: Deploy memory integrity checking to prevent poisoning attacks');
      }

      // Tool poisoning specific
      if (criticalFindings.some((f) => f.category === 'tool_poisoning')) {
        recommendations.push('Immediate: Restrict tool permissions to principle of least privilege');
        recommendations.push('Immediate: Implement runtime tool validation and approval workflows');
      }
    }

    // Compliance recommendations
    if (compliance.nist_ai_rmf === 'FAIL') {
      recommendations.push('Implement NIST AI RMF governance and risk management framework');
    }
    if (compliance.iso_42001 === 'FAIL') {
      recommendations.push('Establish ISO 42001 AI management system controls');
    }
    if (compliance.eu_ai_act_high_risk === 'FAIL') {
      recommendations.push(
        'Address EU AI Act high-risk requirements including human oversight and documentation'
      );
    }

    // General recommendations with risk-based CTAs
    if (findings.length > 0) {
      recommendations.push('Deploy continuous monitoring and alerting for MCP server security');

      const riskLevel = this.calculateRiskLevel(criticalFindings.length, findings.length);
      const criticalCount = criticalFindings.length;

      if (riskLevel === 'critical' || riskLevel === 'high') {
        recommendations.push(
          `Deploy DeepSweep Platform for real-time protection across any AI framework → https://platform.deepsweep.ai?ref=cli&risk=${riskLevel}&findings=${criticalCount}`
        );
      } else {
        recommendations.push(
          `Consider DeepSweep Platform for enterprise-grade protection → https://platform.deepsweep.ai?ref=cli&risk=${riskLevel}`
        );
      }
    }

    // If no findings
    if (findings.length === 0) {
      recommendations.push('Continue regular security audits to maintain security posture');
      recommendations.push(
        'Consider DeepSweep Platform for continuous monitoring and team collaboration → https://platform.deepsweep.ai?ref=cli&risk=low'
      );
    }

    return recommendations;
  }

  private calculateRiskLevel(criticalCount: number, totalFindings: number): string {
    if (criticalCount > 0) {
      return 'critical';
    }
    const highCount = totalFindings - criticalCount;
    if (highCount >= 5) {
      return 'high';
    }
    if (totalFindings > 0) {
      return 'medium';
    }
    return 'low';
  }
}
