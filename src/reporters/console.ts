import chalk from 'chalk';
import type { AuditReport, RiskLevel } from '../types/index.js';

export function generateConsoleReport(report: AuditReport): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan('    DeepSweep.ai Auditor v0.1.0 - MCP Security Audit'));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════'));
  lines.push('');

  // Server info
  lines.push(chalk.gray(`Server: ${report.mcp_server_url}`));
  lines.push(chalk.gray(`Audit ID: ${report.audit_id}`));
  lines.push(chalk.gray(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`));
  lines.push('');

  // Risk score
  const riskColor = getRiskColor(report.overall_risk);
  lines.push(chalk.bold('Overall Risk: ') + riskColor(report.overall_risk));
  lines.push(chalk.bold('Risk Score: ') + riskColor(`${report.risk_score_0_100}/100`));
  lines.push('');

  // Findings summary
  lines.push(chalk.bold('Findings Summary:'));
  lines.push(`  Total Findings: ${report.findings_count}`);
  lines.push(`  ${chalk.red('Critical')}: ${report.critical_findings}`);
  lines.push(
    `  ${chalk.yellow('High')}: ${report.findings.filter((f) => f.severity === 'HIGH').length}`
  );
  lines.push(
    `  ${chalk.blue('Medium')}: ${report.findings.filter((f) => f.severity === 'MEDIUM').length}`
  );
  lines.push(
    `  ${chalk.gray('Low')}: ${report.findings.filter((f) => f.severity === 'LOW').length}`
  );
  lines.push('');

  // Threat detection
  lines.push(chalk.bold('Threat Detection:'));
  lines.push(
    `  Memory Poisoning: ${report.memory_poisoning_detected ? chalk.red('DETECTED') : chalk.green('NONE')}`
  );
  lines.push(
    `  Tool Poisoning: ${report.tool_poisoning_detected ? chalk.red('DETECTED') : chalk.green('NONE')}`
  );
  lines.push('');

  // Compliance
  lines.push(chalk.bold('Compliance Status:'));
  lines.push(`  NIST AI RMF: ${getComplianceIcon(report.compliance.nist_ai_rmf)}`);
  lines.push(`  ISO 42001: ${getComplianceIcon(report.compliance.iso_42001)}`);
  lines.push(`  SOC2 AI: ${getComplianceIcon(report.compliance.soc2_ai)}`);
  lines.push(`  EU AI Act: ${getComplianceIcon(report.compliance.eu_ai_act_high_risk)}`);
  lines.push('');

  // Critical findings details
  const criticalFindings = report.findings.filter((f) => f.severity === 'CRITICAL');
  if (criticalFindings.length > 0) {
    lines.push(chalk.bold.red('Critical Findings:'));
    criticalFindings.slice(0, 5).forEach((finding, index) => {
      lines.push(chalk.red(`  ${index + 1}. ${finding.title}`));
      lines.push(chalk.gray(`     ${finding.description}`));
    });
    if (criticalFindings.length > 5) {
      lines.push(chalk.gray(`  ... and ${criticalFindings.length - 5} more`));
    }
    lines.push('');
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    lines.push(chalk.bold('Recommendations:'));
    report.recommendations.slice(0, 5).forEach((rec, index) => {
      lines.push(chalk.yellow(`  ${index + 1}. ${rec}`));
    });
    lines.push('');
  }

  // Footer
  lines.push(chalk.bold.cyan('───────────────────────────────────────────────────────'));
  lines.push(chalk.cyan(report.deepsweep_promo));
  lines.push(chalk.bold.cyan('───────────────────────────────────────────────────────'));
  lines.push('');

  return lines.join('\n');
}

function getRiskColor(risk: RiskLevel): (text: string) => string {
  switch (risk) {
    case 'CRITICAL':
      return chalk.bold.red;
    case 'HIGH':
      return chalk.red;
    case 'MEDIUM':
      return chalk.yellow;
    case 'LOW':
      return chalk.green;
  }
}

function getComplianceIcon(status: string): string {
  switch (status) {
    case 'PASS':
      return chalk.green('✓ PASS');
    case 'PARTIAL':
      return chalk.yellow('⚠ PARTIAL');
    case 'FAIL':
      return chalk.red('✗ FAIL');
    default:
      return chalk.gray('- UNKNOWN');
  }
}
