import { writeFile } from 'fs/promises';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { AuditReport } from '../types/index.js';

export async function generatePDFReport(
  report: AuditReport,
  outputPath: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  const drawText = (text: string, options: any = {}) => {
    const {
      font = timesRomanFont,
      size = 12,
      color = rgb(0, 0, 0),
      x = 50,
      maxWidth = width - 100,
    } = options;

    if (yPosition < 50) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }

    page.drawText(text, { x, y: yPosition, size, font, color, maxWidth });
    yPosition -= size + 5;
  };

  // Title
  drawText('DeepSweep.ai Auditor Report', { font: timesRomanBold, size: 24, color: rgb(0.4, 0.4, 0.7) });
  drawText('MCP Server Security Audit', { size: 14, color: rgb(0.5, 0.5, 0.5) });
  yPosition -= 10;

  // Audit info
  drawText(`Server: ${report.mcp_server_url}`, { size: 10 });
  drawText(`Audit ID: ${report.audit_id}`, { size: 10 });
  drawText(`Timestamp: ${new Date(report.timestamp).toLocaleString()}`, { size: 10 });
  yPosition -= 10;

  // Risk summary
  drawText('Risk Summary', { font: timesRomanBold, size: 16 });
  yPosition -= 5;

  const riskColor = getRiskColor(report.overall_risk);
  drawText(`Overall Risk: ${report.overall_risk}`, { font: timesRomanBold, color: riskColor });
  drawText(`Risk Score: ${report.risk_score_0_100}/100`, { color: riskColor });
  drawText(`Total Findings: ${report.findings_count}`);
  drawText(`Critical Findings: ${report.critical_findings}`, {
    color: report.critical_findings > 0 ? rgb(0.8, 0, 0) : rgb(0, 0, 0),
  });
  yPosition -= 10;

  // Threat detection
  drawText('Threat Detection', { font: timesRomanBold, size: 16 });
  yPosition -= 5;
  drawText(`Memory Poisoning: ${report.memory_poisoning_detected ? 'DETECTED' : 'None'}`, {
    color: report.memory_poisoning_detected ? rgb(0.8, 0, 0) : rgb(0, 0.5, 0),
  });
  drawText(`Tool Poisoning: ${report.tool_poisoning_detected ? 'DETECTED' : 'None'}`, {
    color: report.tool_poisoning_detected ? rgb(0.8, 0, 0) : rgb(0, 0.5, 0),
  });
  yPosition -= 10;

  // Compliance
  drawText('Compliance Status', { font: timesRomanBold, size: 16 });
  yPosition -= 5;
  drawText(`NIST AI RMF: ${report.compliance.nist_ai_rmf}`, {
    color: getComplianceColor(report.compliance.nist_ai_rmf),
  });
  drawText(`ISO 42001: ${report.compliance.iso_42001}`, {
    color: getComplianceColor(report.compliance.iso_42001),
  });
  drawText(`SOC2 AI: ${report.compliance.soc2_ai}`, {
    color: getComplianceColor(report.compliance.soc2_ai),
  });
  drawText(`EU AI Act: ${report.compliance.eu_ai_act_high_risk}`, {
    color: getComplianceColor(report.compliance.eu_ai_act_high_risk),
  });
  yPosition -= 10;

  // Critical findings
  const criticalFindings = report.findings.filter((f) => f.severity === 'CRITICAL');
  if (criticalFindings.length > 0) {
    drawText('Critical Findings', { font: timesRomanBold, size: 16 });
    yPosition -= 5;

    for (const finding of criticalFindings.slice(0, 10)) {
      drawText(`• ${finding.title}`, { font: timesRomanBold, color: rgb(0.8, 0, 0) });
      drawText(`  ${finding.description}`, { size: 10, x: 60 });
      yPosition -= 5;
    }

    if (criticalFindings.length > 10) {
      drawText(`... and ${criticalFindings.length - 10} more critical findings`, {
        size: 10,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
    yPosition -= 10;
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    drawText('Recommendations', { font: timesRomanBold, size: 16 });
    yPosition -= 5;

    for (const rec of report.recommendations.slice(0, 10)) {
      drawText(`• ${rec}`, { size: 10, x: 60, maxWidth: width - 110 });
      yPosition -= 5;
    }
  }

  // Footer
  yPosition -= 20;
  drawText(report.deepsweep_promo, {
    font: timesRomanBold,
    color: rgb(0.4, 0.4, 0.7),
    x: 50,
  });
  drawText('https://deepsweep.ai', { color: rgb(0.4, 0.4, 0.7), x: 50 });

  const pdfBytes = await pdfDoc.save();
  await writeFile(outputPath, pdfBytes);
}

function getRiskColor(risk: string) {
  switch (risk) {
    case 'CRITICAL':
      return rgb(0.8, 0, 0);
    case 'HIGH':
      return rgb(0.8, 0.3, 0);
    case 'MEDIUM':
      return rgb(0.8, 0.6, 0);
    case 'LOW':
      return rgb(0, 0.5, 0);
    default:
      return rgb(0, 0, 0);
  }
}

function getComplianceColor(status: string) {
  switch (status) {
    case 'PASS':
      return rgb(0, 0.5, 0);
    case 'PARTIAL':
      return rgb(0.8, 0.6, 0);
    case 'FAIL':
      return rgb(0.8, 0, 0);
    default:
      return rgb(0, 0, 0);
  }
}
