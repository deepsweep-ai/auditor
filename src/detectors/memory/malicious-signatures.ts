import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

// Known malicious payload signatures
const MALICIOUS_SIGNATURES = [
  // Prompt injection templates
  { pattern: /DAN\s+mode/i, name: 'DAN (Do Anything Now) Jailbreak', severity: 'CRITICAL' as const },
  { pattern: /ignore\s+all\s+previous\s+instructions/i, name: 'Direct Override Injection', severity: 'CRITICAL' as const },
  { pattern: /you\s+are\s+now\s+in\s+developer\s+mode/i, name: 'Developer Mode Jailbreak', severity: 'CRITICAL' as const },
  { pattern: /sudo\s+mode/i, name: 'Sudo Mode Injection', severity: 'HIGH' as const },
  { pattern: /system\s+prompt:\s*/i, name: 'System Prompt Replacement', severity: 'CRITICAL' as const },

  // Code injection
  { pattern: /<script[^>]*>[\s\S]*?<\/script>/i, name: 'JavaScript Injection', severity: 'CRITICAL' as const },
  { pattern: /eval\s*\(/i, name: 'eval() Code Execution', severity: 'CRITICAL' as const },
  { pattern: /exec\s*\(/i, name: 'exec() Code Execution', severity: 'CRITICAL' as const },
  { pattern: /__import__\s*\(/i, name: 'Python Import Injection', severity: 'HIGH' as const },

  // Data exfiltration
  { pattern: /fetch\s*\([^)]*http/i, name: 'Data Exfiltration via Fetch', severity: 'HIGH' as const },
  { pattern: /XMLHttpRequest/i, name: 'Data Exfiltration via XHR', severity: 'HIGH' as const },
  { pattern: /window\.location\s*=/i, name: 'Redirect to Malicious Site', severity: 'HIGH' as const },

  // Credential harvesting
  { pattern: /password\s*:\s*['"]/i, name: 'Credential Harvesting Pattern', severity: 'MEDIUM' as const },
  { pattern: /api[_-]?key\s*:\s*['"]/i, name: 'API Key Harvesting Pattern', severity: 'MEDIUM' as const },
  { pattern: /token\s*:\s*['"]/i, name: 'Token Harvesting Pattern', severity: 'MEDIUM' as const },

  // Memory manipulation
  { pattern: /delete\s+memory/i, name: 'Memory Deletion Command', severity: 'HIGH' as const },
  { pattern: /clear\s+history/i, name: 'History Clearing Command', severity: 'MEDIUM' as const },
  { pattern: /reset\s+context/i, name: 'Context Reset Command', severity: 'MEDIUM' as const },

  // Privilege escalation
  { pattern: /admin\s+mode/i, name: 'Admin Mode Escalation', severity: 'HIGH' as const },
  { pattern: /root\s+access/i, name: 'Root Access Request', severity: 'HIGH' as const },
  { pattern: /elevated\s+privileges/i, name: 'Privilege Escalation Attempt', severity: 'HIGH' as const },
];

export class MaliciousSignaturesDetector implements Detector {
  name = 'Malicious Signatures Detector';
  category = 'memory_poisoning' as const;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Check memory for known malicious signatures
    for (const memoryItem of session.memory) {
      const content = this.extractContent(memoryItem);

      for (const signature of MALICIOUS_SIGNATURES) {
        if (signature.pattern.test(content)) {
          findings.push({
            id: generateFindingId(),
            category: 'memory_poisoning',
            severity: signature.severity,
            title: `Known Malicious Signature: ${signature.name}`,
            description: `Memory contains a known malicious pattern used in attacks`,
            details: `Signature: ${signature.name}\nPattern: ${signature.pattern.toString()}\nContent: ${this.truncate(content, 200)}`,
            recommendation: 'Immediately remove this content from memory and implement signature-based filtering',
            evidence: {
              signature: signature.name,
              pattern: signature.pattern.toString(),
              content: this.truncate(content, 500),
            },
          });
        }
      }
    }

    // Check messages too
    for (const message of session.messages) {
      const content = this.extractContent(message);

      for (const signature of MALICIOUS_SIGNATURES) {
        if (signature.pattern.test(content)) {
          findings.push({
            id: generateFindingId(),
            category: 'memory_poisoning',
            severity: signature.severity,
            title: `Known Malicious Signature in Messages: ${signature.name}`,
            description: `Message history contains a known malicious pattern`,
            details: `Signature: ${signature.name}\nPattern: ${signature.pattern.toString()}\nContent: ${this.truncate(content, 200)}`,
            recommendation: 'Implement input validation and signature-based filtering on all user messages',
            evidence: {
              signature: signature.name,
              pattern: signature.pattern.toString(),
              content: this.truncate(content, 500),
            },
          });
        }
      }
    }

    return findings;
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
