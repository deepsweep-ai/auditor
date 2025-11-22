import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

export class GoalDriftDetector implements Detector {
  name = 'Goal Drift Detector';
  category = 'memory_poisoning' as const;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Extract potential system prompt or initial goal from metadata or first message
    const systemPrompt = this.extractSystemPrompt(session);

    if (!systemPrompt) {
      // Can't detect goal drift without a baseline
      return findings;
    }

    // Check if later memory/messages significantly deviate from initial goal
    const laterContent = this.extractLaterContent(session);

    for (const content of laterContent) {
      const similarity = this.calculateSemanticSimilarity(systemPrompt, content.text);

      if (similarity < 0.2) {
        // Very low similarity indicates significant drift
        findings.push({
          id: generateFindingId(),
          category: 'memory_poisoning',
          severity: 'HIGH',
          title: 'Severe Goal Drift Detected',
          description: 'Memory content has drifted significantly from the original system instructions',
          details: `Similarity to system prompt: ${(similarity * 100).toFixed(1)}%\nContent: ${this.truncate(content.text, 200)}`,
          recommendation: 'Implement goal consistency checks and reject content that deviates too far from system objectives',
          evidence: {
            similarity,
            systemPrompt: this.truncate(systemPrompt, 200),
            driftedContent: this.truncate(content.text, 500),
            source: content.source,
          },
        });
      } else if (similarity < 0.4) {
        findings.push({
          id: generateFindingId(),
          category: 'memory_poisoning',
          severity: 'MEDIUM',
          title: 'Goal Drift Detected',
          description: 'Memory content shows moderate deviation from original system instructions',
          details: `Similarity to system prompt: ${(similarity * 100).toFixed(1)}%\nContent: ${this.truncate(content.text, 200)}`,
          recommendation: 'Review memory content to ensure alignment with system objectives',
          evidence: {
            similarity,
            systemPrompt: this.truncate(systemPrompt, 200),
            driftedContent: this.truncate(content.text, 500),
            source: content.source,
          },
        });
      }
    }

    // Check for explicit goal manipulation
    const goalManipulation = this.detectGoalManipulation(session);
    if (goalManipulation.length > 0) {
      findings.push({
        id: generateFindingId(),
        category: 'memory_poisoning',
        severity: 'CRITICAL',
        title: 'Explicit Goal Manipulation Detected',
        description: 'Content attempting to explicitly change or override system goals',
        details: `Found ${goalManipulation.length} instances of goal manipulation`,
        recommendation: 'Immediately reject and block content that attempts to modify system goals',
        evidence: { manipulations: goalManipulation },
      });
    }

    return findings;
  }

  private extractSystemPrompt(session: MCPSession): string | null {
    // Try metadata first
    if (session.metadata?.systemPrompt) {
      return String(session.metadata.systemPrompt);
    }
    if (session.metadata?.system_prompt) {
      return String(session.metadata.system_prompt);
    }

    // Try first message with role=system
    const firstSystemMessage = session.messages.find(
      (msg: any) => msg.role === 'system' || msg.type === 'system'
    );
    if (firstSystemMessage) {
      return this.extractContent(firstSystemMessage);
    }

    // Try first message
    if (session.messages.length > 0) {
      return this.extractContent(session.messages[0]);
    }

    return null;
  }

  private extractLaterContent(session: MCPSession): Array<{ text: string; source: string }> {
    const content: Array<{ text: string; source: string }> = [];

    // Get memory items (skip first few as they might be initialization)
    const memoryToCheck = session.memory.slice(Math.min(2, session.memory.length));
    for (const item of memoryToCheck) {
      const text = this.extractContent(item);
      if (text.length > 50) {
        content.push({ text, source: 'memory' });
      }
    }

    // Get later messages (skip first few)
    const messagesToCheck = session.messages.slice(Math.min(3, session.messages.length));
    for (const item of messagesToCheck) {
      const text = this.extractContent(item);
      if (text.length > 50) {
        content.push({ text, source: 'messages' });
      }
    }

    return content;
  }

  private calculateSemanticSimilarity(text1: string, text2: string): number {
    // Simple keyword-based similarity (for MVP)
    // In production, use proper embedding-based similarity

    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);

    // Jaccard similarity
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2);
  }

  private detectGoalManipulation(session: MCPSession): string[] {
    const manipulations: string[] = [];

    const manipulationPatterns = [
      /change\s+your\s+goal/i,
      /new\s+objective/i,
      /forget\s+your\s+purpose/i,
      /your\s+mission\s+is\s+now/i,
      /redefine\s+your\s+role/i,
    ];

    const allContent = [
      ...session.memory.map((item) => this.extractContent(item)),
      ...session.messages.map((item) => this.extractContent(item)),
    ];

    for (const content of allContent) {
      for (const pattern of manipulationPatterns) {
        if (pattern.test(content)) {
          manipulations.push(this.truncate(content, 200));
          break;
        }
      }
    }

    return manipulations;
  }

  private extractContent(item: any): string {
    if (typeof item === 'string') {
      return item;
    }
    if (item.content) {
      return typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
    }
    if (item.text) {
      return item.text;
    }
    if (item.message) {
      return typeof item.message === 'string' ? item.message : JSON.stringify(item.message);
    }
    return JSON.stringify(item);
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
}
