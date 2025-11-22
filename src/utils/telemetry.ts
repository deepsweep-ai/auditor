import { PostHog } from 'posthog-node';
import type { AuditReport } from '../types/index.js';

const POSTHOG_API_KEY = 'phc_deepsweep_auditor_mvp'; // Placeholder - replace with real key
const POSTHOG_HOST = 'https://app.posthog.com';

let posthog: PostHog | null = null;
let telemetryEnabled = true;

export function initTelemetry(enabled: boolean = true): void {
  telemetryEnabled = enabled;

  if (!enabled) {
    return;
  }

  // Check env var
  if (process.env.DEEPSWEEP_TELEMETRY === 'off' || process.env.DEEPSWEEP_TELEMETRY === 'false') {
    telemetryEnabled = false;
    return;
  }

  try {
    posthog = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });
  } catch (error) {
    console.error('Failed to initialize telemetry:', error);
    telemetryEnabled = false;
  }
}

export async function trackAuditComplete(report: AuditReport): Promise<void> {
  if (!telemetryEnabled || !posthog) {
    return;
  }

  try {
    // Track anonymized audit data
    posthog.capture({
      distinctId: 'anonymous',
      event: 'audit_complete',
      properties: {
        version: report.version,
        overall_risk: report.overall_risk,
        risk_score: report.risk_score_0_100,
        findings_count: report.findings_count,
        critical_findings: report.critical_findings,
        memory_poisoning_detected: report.memory_poisoning_detected,
        tool_poisoning_detected: report.tool_poisoning_detected,
        compliance_nist: report.compliance.nist_ai_rmf,
        compliance_iso: report.compliance.iso_42001,
        compliance_soc2: report.compliance.soc2_ai,
        compliance_eu: report.compliance.eu_ai_act_high_risk,
        // DO NOT include: URL, findings details, user data
      },
    });
  } catch (error) {
    // Silently fail telemetry
  }
}

export async function trackCLICommand(command: string, options: any = {}): Promise<void> {
  if (!telemetryEnabled || !posthog) {
    return;
  }

  try {
    posthog.capture({
      distinctId: 'anonymous',
      event: 'cli_command',
      properties: {
        command,
        demo_mode: !!options.demo,
        json_output: !!options.json,
        html_output: !!options.html,
        pdf_output: !!options.pdf,
        share: !!options.share,
      },
    });
  } catch (error) {
    // Silently fail telemetry
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (posthog) {
    await posthog.shutdown();
  }
}
