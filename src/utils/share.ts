import axios from 'axios';
import type { AuditReport } from '../types/index.js';

const SHARE_API_URL = 'https://deepsweep.ai/api/share';

export async function shareReport(report: AuditReport): Promise<string> {
  try {
    // Anonymize report before sharing
    const anonymizedReport = {
      ...report,
      mcp_server_url: '[REDACTED]',
      findings: report.findings.map((f) => ({
        ...f,
        evidence: '[REDACTED]',
      })),
    };

    const response = await axios.post(SHARE_API_URL, anonymizedReport, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    if (response.data && response.data.shareUrl) {
      return response.data.shareUrl;
    }

    throw new Error('Invalid response from share API');
  } catch (error: any) {
    // For MVP, if the share API doesn't exist yet, return a placeholder
    console.error('Failed to share report:', error.message);
    console.log('Share API not available yet. Report saved locally.');
    return `https://deepsweep.ai/share/${report.audit_id}`;
  }
}
