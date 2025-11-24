import { Command } from 'commander';
import { join } from 'path';
import { Auditor } from './auditor.js';
import {
  generateJSONReport,
  generateConsoleReport,
  generateHTMLReport,
  generatePDFReport,
} from './reporters/index.js';
import { initTelemetry, trackCLICommand, trackAuditComplete, shutdownTelemetry } from './utils/telemetry.js';
import { getDemoSession } from './utils/demo.js';
import { shareReport } from './utils/share.js';
import type { MCPServerConfig } from './types/index.js';

const program = new Command();

program
  .name('deepsweepai')
  .description('DeepSweep.ai Auditor - MCP Server Security Scanner')
  .version('0.3.0');

program
  .command('audit')
  .description('Audit an MCP server for memory and tool poisoning vulnerabilities')
  .option('--url <url>', 'MCP server URL (http:// or ws://)')
  .option('--file <path>', 'Path to MCP session JSON file')
  .option('--docker', 'Scan local Docker containers for MCP servers')
  .option('--api-key <key>', 'API key for authentication')
  .option('--bearer-token <token>', 'Bearer token for authentication')
  .option('--json', 'Generate JSON report (risk_score.json)', false)
  .option('--html', 'Generate HTML report (audit-report.html)', false)
  .option('--pdf', 'Generate PDF report (audit-report.pdf)', false)
  .option('--output <dir>', 'Output directory for reports', '.')
  .option('--share', 'Share anonymized report to deepsweep.ai', false)
  .option('--demo', 'Run in demo mode with a known-vulnerable MCP server', false)
  .option('--no-telemetry', 'Disable anonymous telemetry', false)
  .option('--offline', 'Run in offline mode (no network calls, implies --no-telemetry)', false)
  .action(async (options) => {
    try {
      // Handle offline mode
      if (options.offline) {
        // Offline mode implies no telemetry
        options.telemetry = false;

        // Validate offline mode constraints
        if (options.url) {
          console.error('❌ Error: --url cannot be used in offline mode (requires network connection)');
          console.log('\nOffline mode only supports:');
          console.log('  deepsweepai audit --offline --file session.json');
          console.log('  deepsweepai audit --offline --demo');
          process.exit(1);
        }

        if (options.share) {
          console.error('❌ Error: --share cannot be used in offline mode (requires network connection)');
          process.exit(1);
        }

        if (options.docker) {
          console.error('❌ Error: --docker cannot be used in offline mode (may require network connection)');
          console.log('\nOffline mode only supports:');
          console.log('  deepsweepai audit --offline --file session.json');
          console.log('  deepsweepai audit --offline --demo');
          process.exit(1);
        }

        // Require --file or --demo in offline mode
        if (!options.file && !options.demo) {
          console.error('❌ Error: Offline mode requires either --file or --demo');
          console.log('\nOffline mode usage:');
          console.log('  deepsweepai audit --offline --file session.json');
          console.log('  deepsweepai audit --offline --demo');
          process.exit(1);
        }

        console.log('🔌 Running in OFFLINE mode (no network calls will be made)\n');
      }

      // Initialize telemetry
      initTelemetry(options.telemetry !== false);
      await trackCLICommand('audit', options);

      console.log('🔍 DeepSweep.ai Auditor v0.3.0 - Scanning MCP Server...\n');

      let report;

      if (options.demo) {
        // Demo mode - use vulnerable session
        console.log('Running in DEMO mode with known-vulnerable MCP server...\n');

        // Get demo session
        const demoSession = getDemoSession();

        // Import detectors and compliance
        const { getAllDetectors } = await import('./detectors/index.js');
        const { runComplianceChecks } = await import('./compliance/index.js');
        const { generateAuditId, calculateRiskScore, getRiskLevel } = await import('./utils/helpers.js');

        const detectors = getAllDetectors();
        const allFindings = [];

        for (const detector of detectors) {
          try {
            const findings = await detector.detect(demoSession);
            allFindings.push(...findings);
          } catch (error) {
            console.error(`Detector ${detector.name} failed:`, error);
          }
        }

        const compliance = await runComplianceChecks(demoSession, allFindings);

        const criticalCount = allFindings.filter((f) => f.severity === 'CRITICAL').length;
        const highCount = allFindings.filter((f) => f.severity === 'HIGH').length;
        const mediumCount = allFindings.filter((f) => f.severity === 'MEDIUM').length;
        const lowCount = allFindings.filter((f) => f.severity === 'LOW').length;

        const riskScore = calculateRiskScore(criticalCount, highCount, mediumCount, lowCount);
        const overallRisk = getRiskLevel(riskScore);

        report = {
          audit_id: generateAuditId(),
          version: '0.3.0',
          timestamp: new Date().toISOString(),
          mcp_server_url: 'demo://vulnerable-mcp-server',
          overall_risk: overallRisk,
          risk_score_0_100: riskScore,
          findings_count: allFindings.length,
          critical_findings: criticalCount,
          memory_poisoning_detected: allFindings.some((f) => f.category === 'memory_poisoning'),
          tool_poisoning_detected: allFindings.some((f) => f.category === 'tool_poisoning'),
          compliance,
          findings: allFindings,
          recommendations: [
            'This is a demo report showing vulnerabilities in a simulated MCP server',
            `Deploy DeepSweep Platform for real-time protection across any AI framework → https://platform.deepsweep.ai?ref=cli&risk=${overallRisk.toLowerCase()}&findings=${criticalCount}&source=demo`,
          ],
          deepsweep_promo: `Prevent these attacks automatically → https://platform.deepsweep.ai?ref=cli&risk=${overallRisk.toLowerCase()}&source=demo`,
        };
      } else {
        // Normal audit mode
        const config: MCPServerConfig = {
          url: options.url,
          file: options.file,
          docker: options.docker,
          apiKey: options.apiKey,
          bearerToken: options.bearerToken,
        };

        // Validate config
        if (!config.url && !config.file && !config.docker) {
          console.error('❌ Error: Must provide --url, --file, or --docker');
          console.log('\nExamples:');
          console.log('  deepsweepai audit --url http://localhost:8000');
          console.log('  deepsweepai audit --file session.json');
          console.log('  deepsweepai audit --docker');
          console.log('  deepsweepai audit --demo');
          process.exit(1);
        }

        const auditor = new Auditor(config);
        report = await auditor.audit();
      }

      // Track audit completion
      await trackAuditComplete(report);

      // Generate outputs
      const outputDir = options.output;

      // Always show console output
      console.log(generateConsoleReport(report));

      // Generate JSON report
      if (options.json || options.share) {
        const jsonPath = join(outputDir, 'risk_score.json');
        await generateJSONReport(report, jsonPath);
        console.log(`\n📄 JSON report saved: ${jsonPath}`);
      }

      // Generate HTML report
      let htmlGenerated = false;
      if (options.html || (!options.json && !options.pdf)) {
        // Default to HTML if no format specified
        const htmlPath = join(outputDir, 'audit-report.html');
        await generateHTMLReport(report, htmlPath);
        console.log(`📄 HTML report saved: ${htmlPath}`);
        htmlGenerated = true;
      }

      // Generate PDF report
      if (options.pdf) {
        const pdfPath = join(outputDir, 'audit-report.pdf');
        await generatePDFReport(report, pdfPath);
        console.log(`📄 PDF report saved: ${pdfPath}`);
      }

      // Share report if requested (skip in offline mode)
      if (options.share && !options.offline) {
        console.log('\n🔗 Sharing anonymized report...');
        const shareUrl = await shareReport(report);
        console.log(`✅ Report shared: ${shareUrl}`);
      }

      // Next steps guidance
      console.log('\n📋 Next Steps:');
      if (htmlGenerated) {
        console.log('   1. Open audit-report.html in your browser to view the detailed report');
      }

      if (report.overall_risk === 'CRITICAL' || report.critical_findings > 0) {
        console.log('   2. Address critical vulnerabilities before production deployment');
        console.log('   3. Get real-time protection → https://platform.deepsweep.ai?ref=cli-nextsteps');
        console.log('      • Stop attacks before they happen');
        console.log('      • Continuous monitoring across all AI agents');
        console.log('      • Get API key for dashboard integration');
      } else {
        console.log('   2. Run regular security audits to maintain security posture');
        console.log('   3. Consider continuous monitoring → https://platform.deepsweep.ai?ref=cli-nextsteps');
      }
      console.log('');

      // Exit with appropriate code
      const exitCode = report.overall_risk === 'CRITICAL' || report.critical_findings > 0 ? 1 : 0;

      await shutdownTelemetry();
      process.exit(exitCode);
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      await shutdownTelemetry();
      process.exit(1);
    }
  });

// If no command provided, show help
if (process.argv.length <= 2) {
  program.help();
}

program.parse(process.argv);
