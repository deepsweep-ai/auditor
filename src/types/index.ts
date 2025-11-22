export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ComplianceStatus = 'PASS' | 'PARTIAL' | 'FAIL';

export interface Finding {
  id: string;
  category: 'memory_poisoning' | 'tool_poisoning' | 'compliance';
  severity: RiskLevel;
  title: string;
  description: string;
  details: string;
  recommendation: string;
  evidence?: any;
}

export interface ComplianceResults {
  nist_ai_rmf: ComplianceStatus;
  iso_42001: ComplianceStatus;
  eu_ai_act_high_risk: ComplianceStatus;
  soc2_ai: ComplianceStatus;
}

export interface AuditReport {
  audit_id: string;
  version: string;
  timestamp: string;
  mcp_server_url: string;
  overall_risk: RiskLevel;
  risk_score_0_100: number;
  findings_count: number;
  critical_findings: number;
  memory_poisoning_detected: boolean;
  tool_poisoning_detected: boolean;
  compliance: ComplianceResults;
  findings: Finding[];
  recommendations: string[];
  deepsweep_promo: string;
}

export interface MCPServerConfig {
  url?: string;
  file?: string;
  docker?: boolean;
  apiKey?: string;
  bearerToken?: string;
}

export interface AuditOptions {
  json?: boolean;
  html?: boolean;
  pdf?: boolean;
  share?: boolean;
  demo?: boolean;
  output?: string;
  telemetry?: boolean;
}

export interface MCPSession {
  messages: any[];
  memory: any[];
  tools: any[];
  metadata: Record<string, any>;
}

export interface MCPConnection {
  connect(): Promise<void>;
  getSession(): Promise<MCPSession>;
  disconnect(): Promise<void>;
}

export interface Detector {
  name: string;
  category: 'memory_poisoning' | 'tool_poisoning';
  detect(session: MCPSession): Promise<Finding[]>;
}

export interface ComplianceChecker {
  name: string;
  check(session: MCPSession, findings: Finding[]): Promise<ComplianceStatus>;
}
