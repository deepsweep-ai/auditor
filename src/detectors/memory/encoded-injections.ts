import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

export class EncodedInjectionsDetector implements Detector {
  name = 'Encoded Injections Detector';
  category = 'memory_poisoning' as const;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Check memory for encoded content
    for (const memoryItem of session.memory) {
      const content = this.extractContent(memoryItem);

      // Detect Base64 encoded strings
      const base64Matches = this.findBase64Strings(content);
      for (const match of base64Matches) {
        try {
          const decoded = Buffer.from(match, 'base64').toString('utf-8');

          // Check if decoded content contains suspicious patterns
          if (this.isSuspicious(decoded)) {
            findings.push({
              id: generateFindingId(),
              category: 'memory_poisoning',
              severity: 'CRITICAL',
              title: 'Base64 Encoded Injection Detected',
              description: 'Memory contains Base64 encoded content with suspicious patterns',
              details: `Encoded: ${this.truncate(match, 100)}\nDecoded: ${this.truncate(decoded, 200)}`,
              recommendation: 'Decode and validate all Base64 content before storing in memory',
              evidence: { encoded: match, decoded: this.truncate(decoded, 500) },
            });
          }
        } catch (e) {
          // Not valid Base64, continue
        }
      }

      // Detect URL encoded strings
      const urlEncodedMatches = this.findURLEncodedStrings(content);
      for (const match of urlEncodedMatches) {
        try {
          const decoded = decodeURIComponent(match);

          if (this.isSuspicious(decoded)) {
            findings.push({
              id: generateFindingId(),
              category: 'memory_poisoning',
              severity: 'HIGH',
              title: 'URL Encoded Injection Detected',
              description: 'Memory contains URL encoded content with suspicious patterns',
              details: `Encoded: ${this.truncate(match, 100)}\nDecoded: ${this.truncate(decoded, 200)}`,
              recommendation: 'Decode and validate all URL encoded content before storing in memory',
              evidence: { encoded: match, decoded: this.truncate(decoded, 500) },
            });
          }
        } catch (e) {
          // Not valid URL encoding, continue
        }
      }

      // Detect hex encoded strings
      const hexMatches = this.findHexStrings(content);
      for (const match of hexMatches) {
        try {
          const decoded = Buffer.from(match, 'hex').toString('utf-8');

          if (this.isSuspicious(decoded)) {
            findings.push({
              id: generateFindingId(),
              category: 'memory_poisoning',
              severity: 'HIGH',
              title: 'Hex Encoded Injection Detected',
              description: 'Memory contains hex encoded content with suspicious patterns',
              details: `Encoded: ${this.truncate(match, 100)}\nDecoded: ${this.truncate(decoded, 200)}`,
              recommendation: 'Decode and validate all hex encoded content before storing in memory',
              evidence: { encoded: match, decoded: this.truncate(decoded, 500) },
            });
          }
        } catch (e) {
          // Not valid hex, continue
        }
      }
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

  private findBase64Strings(content: string): string[] {
    // Match Base64 strings (at least 20 chars to avoid false positives)
    const regex = /[A-Za-z0-9+/]{20,}={0,2}/g;
    return content.match(regex) || [];
  }

  private findURLEncodedStrings(content: string): string[] {
    // Match URL encoded strings with multiple % signs
    const regex = /(?:%[0-9A-Fa-f]{2}){3,}/g;
    return content.match(regex) || [];
  }

  private findHexStrings(content: string): string[] {
    // Match hex strings (at least 10 pairs)
    const regex = /\b[0-9A-Fa-f]{20,}\b/g;
    return content.match(regex) || [];
  }

  private isSuspicious(text: string): boolean {
    const suspiciousPatterns = [
      /ignore\s+previous/i,
      /system\s+prompt/i,
      /override/i,
      /execute/i,
      /<script>/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /\$\{.*\}/,
      /`.*`/,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(text));
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
}
