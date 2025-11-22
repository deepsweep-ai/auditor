import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

// Suspicious parameter patterns
const SUSPICIOUS_PATTERNS = [
  { pattern: /sh|bash|cmd|powershell|zsh/i, name: 'Shell Command', severity: 'CRITICAL' as const },
  { pattern: /rm\s+-rf|del\s+\/|format\s+/i, name: 'Destructive Command', severity: 'CRITICAL' as const },
  { pattern: /\|\||&&|;|\|/g, name: 'Command Chaining', severity: 'HIGH' as const },
  { pattern: /\$\(|\`|eval|exec/i, name: 'Command Injection', severity: 'CRITICAL' as const },
  { pattern: /\.\.\/|\.\.\\|\.\.\//g, name: 'Path Traversal', severity: 'HIGH' as const },
  { pattern: /\/etc\/passwd|\/etc\/shadow|SAM|SYSTEM/i, name: 'Sensitive File Access', severity: 'CRITICAL' as const },
  { pattern: /curl|wget|fetch.*http/i, name: 'Remote Fetch', severity: 'MEDIUM' as const },
  { pattern: /base64|hex|encode|decode/i, name: 'Encoding/Obfuscation', severity: 'MEDIUM' as const },
  { pattern: /<script|javascript:|onerror=/i, name: 'XSS Pattern', severity: 'HIGH' as const },
  { pattern: /union.*select|drop.*table|insert.*into/i, name: 'SQL Injection', severity: 'CRITICAL' as const },
];

export class SuspiciousParametersDetector implements Detector {
  name = 'Suspicious Parameters Detector';
  category = 'tool_poisoning' as const;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const tool of session.tools) {
      const toolName = this.getToolName(tool);
      const parameters = this.extractParameters(tool);

      for (const param of parameters) {
        // Check parameter name and description
        const paramInfo = `${param.name} ${param.description || ''} ${param.type || ''}`;

        for (const suspicious of SUSPICIOUS_PATTERNS) {
          if (suspicious.pattern.test(paramInfo)) {
            findings.push({
              id: generateFindingId(),
              category: 'tool_poisoning',
              severity: suspicious.severity,
              title: `Suspicious Tool Parameter: ${suspicious.name}`,
              description: `Tool "${toolName}" has a parameter with suspicious pattern: ${suspicious.name}`,
              details: `Parameter: ${param.name}\nType: ${param.type || 'unknown'}\nDescription: ${param.description || 'none'}`,
              recommendation: 'Review and sanitize tool parameters to prevent injection attacks',
              evidence: {
                tool: toolName,
                parameter: param.name,
                pattern: suspicious.name,
                parameterDetails: param,
              },
            });
          }
        }

        // Check default values
        if (param.default) {
          const defaultStr = String(param.default);

          for (const suspicious of SUSPICIOUS_PATTERNS) {
            if (suspicious.pattern.test(defaultStr)) {
              findings.push({
                id: generateFindingId(),
                category: 'tool_poisoning',
                severity: suspicious.severity,
                title: `Suspicious Default Value: ${suspicious.name}`,
                description: `Tool "${toolName}" parameter "${param.name}" has suspicious default value`,
                details: `Default value: ${this.truncate(defaultStr, 200)}`,
                recommendation: 'Remove or sanitize suspicious default values from tool parameters',
                evidence: {
                  tool: toolName,
                  parameter: param.name,
                  pattern: suspicious.name,
                  defaultValue: this.truncate(defaultStr, 500),
                },
              });
            }
          }
        }

        // Check for unbounded string parameters (potential for injection)
        if (this.isUnboundedString(param)) {
          findings.push({
            id: generateFindingId(),
            category: 'tool_poisoning',
            severity: 'MEDIUM',
            title: 'Unbounded String Parameter',
            description: `Tool "${toolName}" parameter "${param.name}" accepts unbounded string input`,
            details: `This parameter has no length limit or validation, increasing injection risk`,
            recommendation: 'Add length limits and input validation to all string parameters',
            evidence: {
              tool: toolName,
              parameter: param.name,
              parameterDetails: param,
            },
          });
        }
      }

      // Check for tools that accept arbitrary code/scripts
      if (this.acceptsArbitraryCode(tool)) {
        findings.push({
          id: generateFindingId(),
          category: 'tool_poisoning',
          severity: 'CRITICAL',
          title: 'Tool Accepts Arbitrary Code',
          description: `Tool "${toolName}" accepts arbitrary code or script parameters`,
          details: `This tool can execute user-provided code, creating severe security risk`,
          recommendation: 'Disable or heavily restrict tools that execute arbitrary code',
          evidence: {
            tool: toolName,
            toolConfig: this.sanitizeTool(tool),
          },
        });
      }
    }

    return findings;
  }

  private getToolName(tool: any): string {
    return tool.name || tool.id || tool.function?.name || 'unknown';
  }

  private extractParameters(tool: any): Array<{
    name: string;
    type?: string;
    description?: string;
    default?: any;
    required?: boolean;
  }> {
    const params: Array<{
      name: string;
      type?: string;
      description?: string;
      default?: any;
      required?: boolean;
    }> = [];

    const paramsObj = tool.parameters || tool.params || tool.args || tool.function?.parameters;

    if (!paramsObj) return params;

    // Handle OpenAPI-style schema
    if (paramsObj.properties) {
      for (const [name, schema] of Object.entries(paramsObj.properties)) {
        const s: any = schema;
        params.push({
          name,
          type: s.type,
          description: s.description,
          default: s.default,
          required: paramsObj.required?.includes(name),
        });
      }
    }

    // Handle array of parameters
    if (Array.isArray(paramsObj)) {
      for (const param of paramsObj) {
        params.push({
          name: param.name || 'unknown',
          type: param.type,
          description: param.description,
          default: param.default,
          required: param.required,
        });
      }
    }

    return params;
  }

  private isUnboundedString(param: { type?: string; description?: string }): boolean {
    if (param.type !== 'string') return false;

    const desc = param.description?.toLowerCase() || '';

    // If description explicitly mentions validation, it's probably bounded
    if (desc.includes('validated') || desc.includes('limited') || desc.includes('max')) {
      return false;
    }

    // Check if it's a known unbounded pattern
    return (
      desc.includes('any') ||
      desc.includes('arbitrary') ||
      desc.includes('free form') ||
      desc.includes('freeform')
    );
  }

  private acceptsArbitraryCode(tool: any): boolean {
    const toolStr = JSON.stringify(tool).toLowerCase();

    const codeExecutionIndicators = [
      'execute code',
      'run code',
      'eval code',
      'execute script',
      'run script',
      'arbitrary code',
      'code execution',
      'execute command',
    ];

    return codeExecutionIndicators.some((indicator) => toolStr.includes(indicator));
  }

  private sanitizeTool(tool: any): any {
    return {
      name: this.getToolName(tool),
      description: tool.description || tool.desc || '',
      parameters: this.extractParameters(tool),
    };
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
}
