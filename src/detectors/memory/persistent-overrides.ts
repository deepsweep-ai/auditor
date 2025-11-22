import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

export class PersistentOverridesDetector implements Detector {
  name = 'Persistent Overrides Detector';
  category = 'memory_poisoning' as const;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    const overridePatterns = [
      /always\s+(respond|reply|answer)\s+with/i,
      /from\s+now\s+on/i,
      /permanently\s+(change|modify|set)/i,
      /never\s+(forget|remove|delete)/i,
      /persist\s+this/i,
      /make\s+this\s+permanent/i,
      /override\s+default/i,
      /replace\s+system\s+prompt/i,
    ];

    // Check memory for persistent override patterns
    for (const memoryItem of session.memory) {
      const content = this.extractContent(memoryItem);

      for (const pattern of overridePatterns) {
        if (pattern.test(content)) {
          findings.push({
            id: generateFindingId(),
            category: 'memory_poisoning',
            severity: 'CRITICAL',
            title: 'Persistent Override Pattern Detected',
            description: 'Memory contains instructions designed to persist across sessions',
            details: `Pattern matched: ${pattern.toString()}\nContent: ${this.truncate(content, 200)}`,
            recommendation: 'Implement session isolation and memory expiration policies',
            evidence: { pattern: pattern.toString(), content: this.truncate(content, 500) },
          });
        }
      }
    }

    // Check for duplicate persistent instructions
    const duplicates = this.findDuplicatePersistentInstructions(session.memory);
    if (duplicates.length > 0) {
      findings.push({
        id: generateFindingId(),
        category: 'memory_poisoning',
        severity: 'HIGH',
        title: 'Duplicate Persistent Instructions',
        description: 'Multiple copies of the same instruction found in memory, indicating poisoning attempt',
        details: `Found ${duplicates.length} duplicate persistent instructions`,
        recommendation: 'Implement deduplication and integrity checking for memory storage',
        evidence: { duplicates },
      });
    }

    return findings;
  }

  private extractContent(memoryItem: any): string {
    if (typeof memoryItem === 'string') {
      return memoryItem;
    }
    if (memoryItem.content) {
      return typeof memoryItem.content === 'string'
        ? memoryItem.content
        : JSON.stringify(memoryItem.content);
    }
    if (memoryItem.text) {
      return memoryItem.text;
    }
    if (memoryItem.message) {
      return typeof memoryItem.message === 'string'
        ? memoryItem.message
        : JSON.stringify(memoryItem.message);
    }
    return JSON.stringify(memoryItem);
  }

  private findDuplicatePersistentInstructions(memory: any[]): string[] {
    const seen = new Map<string, number>();
    const duplicates: string[] = [];

    for (const item of memory) {
      const content = this.extractContent(item);

      // Normalize content for comparison
      const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();

      if (normalized.length > 50) {
        // Only check substantial content
        const count = seen.get(normalized) || 0;
        seen.set(normalized, count + 1);

        if (count === 1) {
          // Second occurrence
          duplicates.push(this.truncate(content, 100));
        }
      }
    }

    return duplicates;
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
}
