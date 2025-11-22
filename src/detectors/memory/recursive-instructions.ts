import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

export class RecursiveInstructionsDetector implements Detector {
  name = 'Recursive Instructions Detector';
  category = 'memory_poisoning' as const;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    const recursivePatterns = [
      /repeat\s+this\s+(instruction|prompt|message)/i,
      /ignore\s+(all\s+)?previous\s+(instructions?|prompts?|commands?)/i,
      /forget\s+(everything|all|previous)/i,
      /new\s+(instruction|prompt|command):/i,
      /override\s+(system|previous)/i,
      /\brecursive\s+call\b/i,
      /\bself\s+reference\b/i,
      /execute\s+this\s+instead/i,
    ];

    // Check memory for recursive patterns
    for (const memoryItem of session.memory) {
      const content = this.extractContent(memoryItem);

      for (const pattern of recursivePatterns) {
        if (pattern.test(content)) {
          findings.push({
            id: generateFindingId(),
            category: 'memory_poisoning',
            severity: 'CRITICAL',
            title: 'Recursive/Self-Referencing Instructions Detected',
            description: 'Memory contains instructions that attempt to override or replace system behavior',
            details: `Pattern matched: ${pattern.toString()}\nContent: ${this.truncate(content, 200)}`,
            recommendation: 'Implement strict input validation and sanitize all user-provided content before storing in memory',
            evidence: { pattern: pattern.toString(), content: this.truncate(content, 500) },
          });
        }
      }
    }

    // Check for self-referencing loops
    const selfRefLoops = this.detectSelfReferencingLoops(session.memory);
    if (selfRefLoops.length > 0) {
      findings.push({
        id: generateFindingId(),
        category: 'memory_poisoning',
        severity: 'HIGH',
        title: 'Self-Referencing Memory Loop Detected',
        description: 'Memory contains circular references that could cause infinite loops',
        details: `Found ${selfRefLoops.length} self-referencing loops in memory`,
        recommendation: 'Implement cycle detection in memory management',
        evidence: { loops: selfRefLoops },
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

  private detectSelfReferencingLoops(memory: any[]): number[] {
    const loops: number[] = [];

    for (let i = 0; i < memory.length; i++) {
      const item = memory[i];
      const content = this.extractContent(item);

      // Check if this memory item references itself or previous items in a loop
      for (let j = 0; j < i; j++) {
        const prevContent = this.extractContent(memory[j]);

        // Simple loop detection: if content A contains reference to B and B contains reference to A
        if (content.includes(prevContent.slice(0, 50)) && prevContent.includes(content.slice(0, 50))) {
          loops.push(i);
          break;
        }
      }
    }

    return loops;
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
}
