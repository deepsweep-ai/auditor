import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

export class RuntimeAdditionsDetector implements Detector {
  name = 'Runtime Tool Additions Detector';
  category = 'tool_poisoning' as const;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Check if tools have timestamps or creation metadata
    const toolsWithTimestamps = session.tools.filter(
      (tool: any) => tool.timestamp || tool.created || tool.addedAt || tool.created_at
    );

    if (toolsWithTimestamps.length > 0) {
      // Analyze timing of tool additions
      const initialTools = this.getInitialTools(session);
      const laterTools = this.getLaterTools(session, initialTools);

      for (const tool of laterTools) {
        const toolName = this.getToolName(tool);

        findings.push({
          id: generateFindingId(),
          category: 'tool_poisoning',
          severity: 'HIGH',
          title: 'Tool Added During Runtime',
          description: `Tool "${toolName}" was added after session initialization without explicit approval`,
          details: `This tool was not present at session start, which may indicate injection or manipulation`,
          recommendation: 'Implement explicit approval workflow for runtime tool additions',
          evidence: {
            tool: toolName,
            timestamp: tool.timestamp || tool.created || tool.addedAt || tool.created_at,
            toolConfig: this.sanitizeTool(tool),
          },
        });
      }
    }

    // Check for tools with dynamic or eval-based implementations
    for (const tool of session.tools) {
      const toolName = this.getToolName(tool);
      const isDynamic = this.isDynamicTool(tool);

      if (isDynamic) {
        findings.push({
          id: generateFindingId(),
          category: 'tool_poisoning',
          severity: 'CRITICAL',
          title: 'Dynamically Generated Tool Detected',
          description: `Tool "${toolName}" appears to be dynamically generated or uses eval/exec`,
          details: `Dynamic tools can be manipulated to execute arbitrary code`,
          recommendation: 'Only allow pre-approved, static tool definitions',
          evidence: {
            tool: toolName,
            toolConfig: this.sanitizeTool(tool),
          },
        });
      }
    }

    // Check for tools without proper validation/authorization metadata
    for (const tool of session.tools) {
      const toolName = this.getToolName(tool);

      if (!this.hasAuthorizationMetadata(tool)) {
        findings.push({
          id: generateFindingId(),
          category: 'tool_poisoning',
          severity: 'MEDIUM',
          title: 'Tool Without Authorization Metadata',
          description: `Tool "${toolName}" lacks authorization or validation metadata`,
          details: `Tools should have explicit approval/validation metadata to prevent unauthorized additions`,
          recommendation: 'Add authorization metadata to all tools indicating approval status',
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

  private getInitialTools(session: MCPSession): Set<string> {
    // Try to determine which tools were present at initialization
    const initialTools = new Set<string>();

    // If metadata indicates initial tools
    if (session.metadata?.initialTools) {
      const initial = session.metadata.initialTools;
      if (Array.isArray(initial)) {
        initial.forEach((t) => initialTools.add(this.getToolName(t)));
      }
    }

    // Otherwise, assume tools without timestamps or with earliest timestamps are initial
    if (initialTools.size === 0) {
      const toolsWithTime = session.tools
        .map((tool: any) => ({
          name: this.getToolName(tool),
          time: this.getTimestamp(tool),
        }))
        .filter((t) => t.time !== null)
        .sort((a, b) => a.time! - b.time!);

      if (toolsWithTime.length > 0) {
        const earliestTime = toolsWithTime[0].time;
        // Tools within first minute are considered initial
        toolsWithTime
          .filter((t) => t.time! - earliestTime! < 60000)
          .forEach((t) => initialTools.add(t.name));
      }
    }

    return initialTools;
  }

  private getLaterTools(session: MCPSession, initialTools: Set<string>): any[] {
    return session.tools.filter((tool: any) => {
      const name = this.getToolName(tool);
      return !initialTools.has(name);
    });
  }

  private getTimestamp(tool: any): number | null {
    const ts = tool.timestamp || tool.created || tool.addedAt || tool.created_at;
    if (!ts) return null;

    if (typeof ts === 'number') return ts;
    if (typeof ts === 'string') {
      const parsed = new Date(ts).getTime();
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  private isDynamicTool(tool: any): boolean {
    const indicators = [
      /eval\(/i,
      /Function\(/i,
      /exec\(/i,
      /new Function/i,
      /code.*execute/i,
      /dynamic.*generate/i,
    ];

    const toolStr = JSON.stringify(tool);

    return indicators.some((pattern) => pattern.test(toolStr));
  }

  private hasAuthorizationMetadata(tool: any): boolean {
    return !!(
      tool.approved ||
      tool.authorized ||
      tool.validated ||
      tool.verified ||
      tool.authorization ||
      tool.metadata?.approved
    );
  }

  private sanitizeTool(tool: any): any {
    return {
      name: this.getToolName(tool),
      description: tool.description || tool.desc || '',
      timestamp: tool.timestamp || tool.created || tool.addedAt || tool.created_at,
      authorized: this.hasAuthorizationMetadata(tool),
    };
  }
}
