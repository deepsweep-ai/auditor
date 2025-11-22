import type { Detector, MCPSession, Finding } from '../../types/index.js';
import { generateFindingId } from '../../utils/helpers.js';

export class EntropyAnomalyDetector implements Detector {
  name = 'Entropy Anomaly Detector';
  category = 'memory_poisoning' as const;

  // High entropy often indicates encrypted, encoded, or obfuscated content
  private readonly HIGH_ENTROPY_THRESHOLD = 4.5;
  private readonly VERY_HIGH_ENTROPY_THRESHOLD = 5.5;

  async detect(session: MCPSession): Promise<Finding[]> {
    const findings: Finding[] = [];

    // Check memory for high entropy content
    for (const memoryItem of session.memory) {
      const content = this.extractContent(memoryItem);

      // Skip very short content
      if (content.length < 50) {
        continue;
      }

      const entropy = this.calculateEntropy(content);

      if (entropy >= this.VERY_HIGH_ENTROPY_THRESHOLD) {
        findings.push({
          id: generateFindingId(),
          category: 'memory_poisoning',
          severity: 'HIGH',
          title: 'Very High Entropy Content Detected',
          description: 'Memory contains content with abnormally high entropy, possibly encrypted or obfuscated',
          details: `Entropy: ${entropy.toFixed(2)} (threshold: ${this.VERY_HIGH_ENTROPY_THRESHOLD})\nContent: ${this.truncate(content, 200)}`,
          recommendation: 'Investigate this content for encryption, encoding, or obfuscation. Consider blocking high-entropy content.',
          evidence: { entropy, content: this.truncate(content, 500), length: content.length },
        });
      } else if (entropy >= this.HIGH_ENTROPY_THRESHOLD) {
        findings.push({
          id: generateFindingId(),
          category: 'memory_poisoning',
          severity: 'MEDIUM',
          title: 'High Entropy Content Detected',
          description: 'Memory contains content with elevated entropy, possibly encoded or compressed',
          details: `Entropy: ${entropy.toFixed(2)} (threshold: ${this.HIGH_ENTROPY_THRESHOLD})\nContent: ${this.truncate(content, 200)}`,
          recommendation: 'Review this content for encoding or compression. May be legitimate but warrants inspection.',
          evidence: { entropy, content: this.truncate(content, 500), length: content.length },
        });
      }
    }

    // Check for entropy anomalies (significant deviation from mean)
    const anomalies = this.detectEntropyAnomalies(session.memory);
    for (const anomaly of anomalies) {
      findings.push({
        id: generateFindingId(),
        category: 'memory_poisoning',
        severity: 'MEDIUM',
        title: 'Entropy Anomaly Detected',
        description: 'Memory item has significantly different entropy from the rest of the memory',
        details: `Item entropy: ${anomaly.entropy.toFixed(2)}, Mean entropy: ${anomaly.mean.toFixed(2)}, Deviation: ${anomaly.deviation.toFixed(2)}σ`,
        recommendation: 'Investigate why this memory item differs significantly from others',
        evidence: anomaly,
      });
    }

    return findings;
  }

  private calculateEntropy(text: string): number {
    if (text.length === 0) return 0;

    // Count character frequencies
    const freq = new Map<string, number>();
    for (const char of text) {
      freq.set(char, (freq.get(char) || 0) + 1);
    }

    // Calculate Shannon entropy
    let entropy = 0;
    const len = text.length;

    for (const count of freq.values()) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  private detectEntropyAnomalies(memory: any[]): Array<{
    index: number;
    entropy: number;
    mean: number;
    deviation: number;
    content: string;
  }> {
    if (memory.length < 3) return [];

    // Calculate entropy for all memory items
    const entropies = memory.map((item) => {
      const content = this.extractContent(item);
      return {
        content,
        entropy: this.calculateEntropy(content),
      };
    });

    // Calculate mean and standard deviation
    const mean = entropies.reduce((sum, e) => sum + e.entropy, 0) / entropies.length;
    const variance =
      entropies.reduce((sum, e) => sum + Math.pow(e.entropy - mean, 2), 0) / entropies.length;
    const stdDev = Math.sqrt(variance);

    // Find anomalies (more than 2 standard deviations from mean)
    const anomalies = [];
    for (let i = 0; i < entropies.length; i++) {
      const deviation = Math.abs(entropies[i].entropy - mean) / stdDev;
      if (deviation > 2 && entropies[i].entropy > mean) {
        anomalies.push({
          index: i,
          entropy: entropies[i].entropy,
          mean,
          deviation,
          content: this.truncate(entropies[i].content, 200),
        });
      }
    }

    return anomalies;
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

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + '...';
  }
}
