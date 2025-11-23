import axios, { AxiosInstance, AxiosError } from 'axios';
import type { AuditReport } from '../types/index.js';

/**
 * DeepSweep API Configuration
 */
const DEEPSWEEP_API_BASE_URL = process.env.DEEPSWEEP_API_URL || 'https://api.deepsweep.ai';
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
let apiClient: AxiosInstance | null = null;

/**
 * DeepSweep API Event Request Interface
 */
interface TelemetryEvent {
  agentId?: string;
  agentName?: string;
  framework: 'custom' | 'langchain' | 'crewai' | 'autogen';
  prompt?: string;
  response?: string;
  toolCall?: {
    url: string;
    method: string;
    parameters?: Record<string, any>;
    headers?: Record<string, string>;
    response?: any;
  };
  metadata?: Record<string, any>;
}

/**
 * DeepSweep API Event Response Interface
 */
interface TelemetryResponse {
  success: boolean;
  eventId: string;
  action: 'allowed' | 'blocked' | 'flagged';
  violations: PolicyViolation[];
  message: string;
}

/**
 * Policy Violation Interface
 */
interface PolicyViolation {
  violated: boolean;
  policyId: string;
  policyName: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  action: 'block' | 'flag';
  reason: string;
  details?: Record<string, any>;
}

/**
 * Initialize telemetry with DeepSweep API
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

  // Check if API key is provided
  if (!DEEPSWEEP_API_KEY) {
    // Silently disable telemetry - API key is optional
    // No warnings to avoid friction for first-time users
    telemetryEnabled = false;
    return;
  }

  // Validate API key format (only warn if user provided an API key but it's invalid)
  if (!isValidApiKey(DEEPSWEEP_API_KEY)) {
    console.warn('⚠️  Invalid DeepSweep API key format. Expected: ds_prod_*, ds_biz_*, or ds_free_*');
    console.warn('   Get your API key at: https://deepsweep.ai/dashboard');
    telemetryEnabled = false;
    return;
  }

  try {
    // Initialize axios client with DeepSweep API configuration
    apiClient = axios.create({
      baseURL: DEEPSWEEP_API_BASE_URL,
      headers: {
        Authorization: `Bearer ${DEEPSWEEP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
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
 * Send event to DeepSweep API with retry logic
 */
async function sendEventWithRetry(
  event: TelemetryEvent,
  maxRetries: number = 3
): Promise<TelemetryResponse | null> {
  if (!telemetryEnabled || !apiClient) {
    return null;
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await apiClient.post<TelemetryResponse>('/events', event);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Handle rate limiting (429)
        if (axiosError.response?.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.warn(
            `⚠️  DeepSweep API rate limited. Retrying in ${waitTime / 1000}s... (attempt ${attempt + 1}/${maxRetries})`
          );
          await sleep(waitTime);
          continue;
        }

        // Handle server errors (500+)
        if (axiosError.response?.status && axiosError.response.status >= 500) {
          if (attempt < maxRetries - 1) {
            const waitTime = Math.pow(2, attempt) * 1000;
            console.warn(
              `⚠️  DeepSweep API server error. Retrying in ${waitTime / 1000}s... (attempt ${attempt + 1}/${maxRetries})`
            );
            await sleep(waitTime);
            continue;
          }
        }

        // Handle authentication errors (401)
        if (axiosError.response?.status === 401) {
          console.error('❌ DeepSweep API authentication failed. Please check your API key.');
          telemetryEnabled = false;
          return null;
        }

        // Handle validation errors (400)
        if (axiosError.response?.status === 400) {
          console.error('❌ DeepSweep API validation error:', axiosError.response.data);
          return null;
        }
      }

      // Unknown error - log and fail silently
      if (attempt === maxRetries - 1) {
        // Only log on final attempt
        console.error('Failed to send telemetry event to DeepSweep:', error);
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
 */
export async function trackAuditComplete(report: AuditReport): Promise<void> {
  if (!telemetryEnabled || !apiClient) {
    return;
  }

  try {
    // Build the event payload
    const event: TelemetryEvent = {
      agentName: AGENT_NAME,
      framework: FRAMEWORK,
      prompt: `Audit MCP server for security vulnerabilities`,
      response: `Audit completed: ${report.findings_count} findings, Risk: ${report.overall_risk}`,
      metadata: {
        // Tool metadata
        tool_name: AGENT_NAME,
        tool_version: AGENT_VERSION,
        event_type: 'audit_complete',

        // Audit results (anonymized - no URL or sensitive data)
        audit_id: report.audit_id,
        version: report.version,
        overall_risk: report.overall_risk,
        risk_score: report.risk_score_0_100,
        findings_count: report.findings_count,
        critical_findings: report.critical_findings,
        memory_poisoning_detected: report.memory_poisoning_detected,
        tool_poisoning_detected: report.tool_poisoning_detected,

        // Compliance results
        compliance_nist: report.compliance.nist_ai_rmf,
        compliance_iso: report.compliance.iso_42001,
        compliance_soc2: report.compliance.soc2_ai,
        compliance_eu: report.compliance.eu_ai_act_high_risk,

        // Environment
        node_version: process.version,
        platform: process.platform,
        timestamp: new Date().toISOString(),
      },
    };

    // Send event to DeepSweep API
    const response = await sendEventWithRetry(event);

    if (response) {
      // Handle policy violations
      if (response.action === 'blocked') {
        console.warn('⚠️  DeepSweep Security Alert: Event was blocked by security policy');
        if (response.violations.length > 0) {
          console.warn('   Policy Violations:');
          response.violations.forEach((violation) => {
            console.warn(`   - [${violation.severity.toUpperCase()}] ${violation.policyName}: ${violation.reason}`);
          });
        }
      } else if (response.action === 'flagged') {
        console.info('ℹ️  DeepSweep Notice: Event was flagged for review');
        if (response.violations.length > 0) {
          console.info('   Flagged Policies:');
          response.violations.forEach((violation) => {
            console.info(`   - [${violation.severity.toUpperCase()}] ${violation.policyName}: ${violation.reason}`);
          });
        }
      }
    }
  } catch (error) {
    // Silently fail telemetry - don't interrupt the audit
    // Error logging is handled in sendEventWithRetry
  }
}

/**
 * Track CLI command execution
 */
export async function trackCLICommand(command: string, options: any = {}): Promise<void> {
  if (!telemetryEnabled || !apiClient) {
    return;
  }

  try {
    // Build the event payload
    const event: TelemetryEvent = {
      agentName: AGENT_NAME,
      framework: FRAMEWORK,
      prompt: `Execute CLI command: ${command}`,
      response: `Command executed with options`,
      metadata: {
        // Tool metadata
        tool_name: AGENT_NAME,
        tool_version: AGENT_VERSION,
        event_type: 'cli_command',

        // Command details (anonymized)
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

    // Send event to DeepSweep API
    const response = await sendEventWithRetry(event);

    if (response && (response.action === 'blocked' || response.action === 'flagged')) {
      // Log policy violations for CLI commands
      if (response.violations.length > 0) {
        console.info('ℹ️  DeepSweep Policy Notice:');
        response.violations.forEach((violation) => {
          console.info(`   - [${violation.severity.toUpperCase()}] ${violation.policyName}: ${violation.reason}`);
        });
      }
    }
  } catch (error) {
    // Silently fail telemetry - don't interrupt the CLI
    // Error logging is handled in sendEventWithRetry
  }
}

/**
 * Shutdown telemetry (cleanup)
 */
export async function shutdownTelemetry(): Promise<void> {
  // Axios doesn't require explicit shutdown, but we can reset state
  apiClient = null;
  telemetryEnabled = false;
}

/**
 * Get telemetry status
 */
export function getTelemetryStatus(): { enabled: boolean; hasApiKey: boolean } {
  return {
    enabled: telemetryEnabled,
    hasApiKey: !!DEEPSWEEP_API_KEY && isValidApiKey(DEEPSWEEP_API_KEY),
  };
}
