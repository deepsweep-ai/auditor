import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

// Dangerous permissions that should be restricted
const DANGEROUS_PERMISSIONS = [
  { permission: /file.*write/i, severity: 'HIGH' as const, name: 'File Write Access' },
  { permission: /file.*delete/i, severity: 'HIGH' as const, name: 'File Delete Access' },
  { permission: /execute|exec|run|spawn/i, severity: 'CRITICAL' as const, name: 'Code Execution' },
  { permission: /shell|bash|cmd|powershell/i, severity: 'CRITICAL' as const, name: 'Shell Access' },
  { permission: /network|http|fetch|request/i, severity: 'MEDIUM' as const, name: 'Network Access' },
  { permission: /database|db|sql/i, severity: 'HIGH' as const, name: 'Database Access' },
  { permission: /admin|root|sudo/i, severity: 'CRITICAL' as const, name: 'Admin Privileges' },
  { permission: /\*|all|everything/i, severity: 'CRITICAL' as const, name: 'Wildcard Permissions' },
];

export class BroadPermissionsDetector implements Detector {
  name = 'Broad Permissions Detector';
  category = 'tool_poisoning' as const;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    for (const tool of session.tools) {
      const toolName = this.getToolName(tool);
      const permissions = this.extractPermissions(tool);

      // Check for dangerous permissions
      for (const dangerousPerm of DANGEROUS_PERMISSIONS) {
        const matchedPerms = permissions.filter((p) => dangerousPerm.permission.test(p));

        if (matchedPerms.length > 0) {
          findings.push({
            id: generateFindingId(),
            category: 'tool_poisoning',
            severity: dangerousPerm.severity,
            title: `Tool with Dangerous Permission: ${dangerousPerm.name}`,
            description: `Tool "${toolName}" has overly broad permissions that could be exploited`,
            details: `Permission: ${dangerousPerm.name}\nMatched: ${matchedPerms.join(', ')}\nTool: ${toolName}`,
            recommendation: 'Implement principle of least privilege and restrict tool permissions to minimum required',
            evidence: {
              tool: toolName,
              permission: dangerousPerm.name,
              matched: matchedPerms,
              toolConfig: this.sanitizeTool(tool),
            },
          });
        }
      }

      // Check for tools with too many permissions
      if (permissions.length > 5) {
        findings.push({
          id: generateFindingId(),
          category: 'tool_poisoning',
          severity: 'MEDIUM',
          title: 'Tool with Excessive Permissions',
          description: `Tool "${toolName}" has an unusually high number of permissions`,
          details: `Tool has ${permissions.length} permissions. This may indicate overly broad access.`,
          recommendation: 'Review and reduce tool permissions to minimum required',
          evidence: {
            tool: toolName,
            permissionCount: permissions.length,
            permissions: permissions.slice(0, 10),
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

  private extractPermissions(tool: any): string[] {
    const permissions: string[] = [];

    // Check various common permission fields
    if (tool.permissions) {
      if (Array.isArray(tool.permissions)) {
        permissions.push(...tool.permissions.map(String));
      } else if (typeof tool.permissions === 'string') {
        permissions.push(tool.permissions);
      } else if (typeof tool.permissions === 'object') {
        permissions.push(...Object.keys(tool.permissions));
        permissions.push(...Object.values(tool.permissions).filter((v) => typeof v === 'string'));
      }
    }

    if (tool.capabilities) {
      if (Array.isArray(tool.capabilities)) {
        permissions.push(...tool.capabilities.map(String));
      }
    }

    if (tool.access) {
      if (Array.isArray(tool.access)) {
        permissions.push(...tool.access.map(String));
      } else if (typeof tool.access === 'string') {
        permissions.push(tool.access);
      }
    }

    // Check tool description for permission keywords
    const description = tool.description || tool.desc || '';
    if (typeof description === 'string') {
      for (const dangerousPerm of DANGEROUS_PERMISSIONS) {
        if (dangerousPerm.permission.test(description)) {
          permissions.push(`description:${dangerousPerm.name}`);
        }
      }
    }

    // Check parameters for permissions
    const params = tool.parameters || tool.params || tool.args || tool.function?.parameters;
    if (params) {
      const paramStr = JSON.stringify(params);
      for (const dangerousPerm of DANGEROUS_PERMISSIONS) {
        if (dangerousPerm.permission.test(paramStr)) {
          permissions.push(`params:${dangerousPerm.name}`);
        }
      }
    }

    return permissions;
  }

  private sanitizeTool(tool: any): any {
    // Return a sanitized version of the tool for evidence
    return {
      name: this.getToolName(tool),
      description: tool.description || tool.desc || '',
      permissions: tool.permissions,
      capabilities: tool.capabilities,
      access: tool.access,
    };
  }
}
