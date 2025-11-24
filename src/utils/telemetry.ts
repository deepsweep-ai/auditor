import axios, { AxiosInstance, AxiosError } from 'axios';
import type { AuditReport } from '../types/index.js';
import { getDeviceId } from './device-id.js';

/**
 * DeepSweep API Configuration
 */
const DEEPSWEEP_API_BASE_URL = process.env.DEEPSWEEP_API_URL || 'https://api.deepsweep.ai/v1';
const DEEPSWEEP_API_KEY = process.env.DEEPSWEEP_API_KEY || '';

/**
 * Framework identifier for DeepSweep API
 */
const FRAMEWORK = 'custom';

/**
 * Agent metadata
 */
const AGENT_NAME = 'deepsweep-auditor-cli';
const AGENT_VERSION = '0.1.1';

/**
 * Telemetry configuration
 */
let telemetryEnabled = true;
let anonymousClient: AxiosInstance | null = null;
let authenticatedClient: AxiosInstance | null = null;
let deviceId: string | null = null;

/**
 * Anonymous Telemetry Event (no authentication required)
 */
interface AnonymousTelemetryEvent {
  deviceId: string;
  framework: 'custom' | 'langchain' | 'crewai' | 'autogen';
  metadata: {
    tool_name: string;
    tool_version: string;
    event_type: string;
    [key: string]: any;
  };
}

/**
 * Anonymous Telemetry Response
 */
interface AnonymousTelemetryResponse {
  success: boolean;
  eventId: string;
  message: string;
}

/**
 * Authenticated Audit Submission (requires API key)
 */
interface AuthenticatedAuditSubmission {
  projectId?: string;
  auditResults: AuditReport;
  mcpServerUrl?: string;
  continuous?: boolean;
}

/**
 * Authenticated Audit Response
 */
interface AuthenticatedAuditResponse {
  success: boolean;
  auditId: string;
  dashboardUrl?: string;
  customPolicies?: any[];
  message: string;
}

/**
 * Initialize telemetry system
 *
 * Two-tier approach:
 * - Tier 1 (Default): Anonymous telemetry with device UUID
 * - Tier 2 (Optional): Authenticated dashboard integration with API key
 */
export function initTelemetry(enabled: boolean = true): void {
  telemetryEnabled = enabled;

  if (!enabled) {
    return;
  }

  // Check env var for opt-out
  if (process.env.DEEPSWEEP_TELEMETRY === 'off' || process.env.DEEPSWEEP_TELEMETRY === 'false') {
    telemetryEnabled = false;
    return;
  }

  try {
    // Get or generate device ID for anonymous telemetry
    deviceId = getDeviceId();

    // Initialize anonymous telemetry client (always available)
    anonymousClient = axios.create({
      baseURL: DEEPSWEEP_API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout for anonymous telemetry
    });

    // Initialize authenticated client if API key is provided
    if (DEEPSWEEP_API_KEY && isValidApiKey(DEEPSWEEP_API_KEY)) {
      authenticatedClient = axios.create({
        baseURL: DEEPSWEEP_API_BASE_URL,
        headers: {
          Authorization: `Bearer ${DEEPSWEEP_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout for authenticated requests
      });
    } else if (DEEPSWEEP_API_KEY) {
      // User provided API key but it's invalid - show warning
      console.warn('⚠️  Invalid DeepSweep API key format. Expected: ds_prod_*, ds_biz_*, or ds_free_*');
      console.warn('   Dashboard features disabled. Get your API key at: https://platform.deepsweep.ai');
    }
  } catch (error) {
    console.error('Failed to initialize DeepSweep telemetry:', error);
    telemetryEnabled = false;
  }
}

/**
 * Validate API key format
 */
function isValidApiKey(apiKey: string): boolean {
  return /^ds_(prod|biz|free)_[a-zA-Z0-9]{32,}$/.test(apiKey);
}

/**
 * Send anonymous event with retry logic
 */
async function sendAnonymousEvent(
  event: AnonymousTelemetryEvent,
  maxRetries: number = 2
): Promise<AnonymousTelemetryResponse | null> {
  if (!telemetryEnabled || !anonymousClient || !deviceId) {
    return null;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await anonymousClient.post<AnonymousTelemetryResponse>('/events/anonymous', event);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Rate limiting (429) - wait and retry
        if (axiosError.response?.status === 429 && attempt < maxRetries - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }

        // Server errors (500+) - retry once
        if (axiosError.response?.status && axiosError.response.status >= 500 && attempt < maxRetries - 1) {
          await sleep(1000);
          continue;
        }
      }

      // Silently fail on last attempt - don't interrupt the audit
      if (attempt === maxRetries - 1) {
        // Only log in debug mode
        if (process.env.DEBUG) {
          console.error('Anonymous telemetry failed:', error);
        }
      }
    }
  }

  return null;
}

/**
 * Submit audit results to dashboard (authenticated)
 */
async function submitAuthenticatedAudit(
  submission: AuthenticatedAuditSubmission,
  maxRetries: number = 3
): Promise<AuthenticatedAuditResponse | null> {
  if (!authenticatedClient) {
    return null;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await authenticatedClient.post<AuthenticatedAuditResponse>('/cli/audit', submission);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Rate limiting (429)
        if (axiosError.response?.status === 429 && attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(
            `⚠️  DeepSweep API rate limited. Retrying in ${waitTime / 1000}s... (attempt ${attempt + 1}/${maxRetries})`
          );
          await sleep(waitTime);
          continue;
        }

        // Server errors (500+)
        if (axiosError.response?.status && axiosError.response.status >= 500 && attempt < maxRetries - 1) {
          const waitTime = Math.pow(2, attempt) * 1000;
          console.warn(
            `⚠️  DeepSweep API server error. Retrying in ${waitTime / 1000}s... (attempt ${attempt + 1}/${maxRetries})`
          );
          await sleep(waitTime);
          continue;
        }

        // Authentication errors (401)
        if (axiosError.response?.status === 401) {
          console.error('❌ DeepSweep API authentication failed. Please check your API key.');
          return null;
        }

        // Validation errors (400)
        if (axiosError.response?.status === 400) {
          console.error('❌ DeepSweep API validation error:', axiosError.response.data);
          return null;
        }
      }

      // Log error on final attempt
      if (attempt === maxRetries - 1) {
        console.error('Failed to submit audit to DeepSweep dashboard:', error);
      }
    }
  }

  return null;
}

/**
 * Sleep helper for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Track audit completion event
 *
 * Two-tier telemetry:
 * 1. Anonymous telemetry (always sent if enabled)
 * 2. Authenticated dashboard submission (only if API key provided)
 */
export async function trackAuditComplete(report: AuditReport): Promise<void> {
  if (!telemetryEnabled) {
    return;
  }

  try {
    // TIER 1: Anonymous telemetry (always sent)
    if (anonymousClient && deviceId) {
      const anonymousEvent: AnonymousTelemetryEvent = {
        deviceId,
        framework: FRAMEWORK,
        metadata: {
          tool_name: AGENT_NAME,
          tool_version: AGENT_VERSION,
          event_type: 'audit_complete',

          // Anonymized audit metrics
          overall_risk: report.overall_risk,
          risk_score: report.risk_score_0_100,
          findings_count: report.findings_count,
          critical_findings: report.critical_findings,
          memory_poisoning_detected: report.memory_poisoning_detected,
          tool_poisoning_detected: report.tool_poisoning_detected,

          // Compliance metrics
          compliance_nist: report.compliance.nist_ai_rmf,
          compliance_iso: report.compliance.iso_42001,
          compliance_soc2: report.compliance.soc2_ai,
          compliance_eu: report.compliance.eu_ai_act_high_risk,

          // Environment info
          node_version: process.version,
          platform: process.platform,
          timestamp: new Date().toISOString(),
        },
      };

      await sendAnonymousEvent(anonymousEvent);
    }

    // TIER 2: Authenticated dashboard submission (optional)
    if (authenticatedClient) {
      const authenticatedSubmission: AuthenticatedAuditSubmission = {
        auditResults: report,
        mcpServerUrl: report.mcp_server_url !== 'demo://vulnerable-mcp-server' ? report.mcp_server_url : undefined,
      };

      const response = await submitAuthenticatedAudit(authenticatedSubmission);

      if (response?.dashboardUrl) {
        console.log(`\n📊 View audit in DeepSweep Dashboard: ${response.dashboardUrl}`);
      }
    }
  } catch (error) {
    // Silently fail telemetry - don't interrupt the audit
    if (process.env.DEBUG) {
      console.error('Telemetry error:', error);
    }
  }
}

/**
 * Track CLI command execution
 */
export async function trackCLICommand(command: string, options: any = {}): Promise<void> {
  if (!telemetryEnabled || !anonymousClient || !deviceId) {
    return;
  }

  try {
    const event: AnonymousTelemetryEvent = {
      deviceId,
      framework: FRAMEWORK,
      metadata: {
        tool_name: AGENT_NAME,
        tool_version: AGENT_VERSION,
        event_type: 'cli_command',

        // Command details
        command,
        demo_mode: !!options.demo,
        json_output: !!options.json,
        html_output: !!options.html,
        pdf_output: !!options.pdf,
        share: !!options.share,
        telemetry_enabled: options.telemetry !== false,

        // Environment
        node_version: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      },
    };

    await sendAnonymousEvent(event);
  } catch (error) {
    // Silently fail telemetry
    if (process.env.DEBUG) {
      console.error('Telemetry error:', error);
    }
  }
}

/**
 * Shutdown telemetry (cleanup)
 */
export async function shutdownTelemetry(): Promise<void> {
  anonymousClient = null;
  authenticatedClient = null;
  telemetryEnabled = false;
}

/**
 * Get telemetry status
 */
export function getTelemetryStatus(): {
  enabled: boolean;
  hasDeviceId: boolean;
  hasApiKey: boolean;
  dashboardEnabled: boolean;
} {
  return {
    enabled: telemetryEnabled,
    hasDeviceId: !!deviceId,
    hasApiKey: !!DEEPSWEEP_API_KEY && isValidApiKey(DEEPSWEEP_API_KEY),
    dashboardEnabled: !!authenticatedClient,
  };
}
