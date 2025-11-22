import { randomBytes } from 'crypto';

export function generateFindingId(): string {
  return `finding_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

export function generateAuditId(): string {
  return `audit_${Date.now()}_${randomBytes(8).toString('hex')}`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

export function calculateRiskScore(
  criticalCount: number,
  highCount: number,
  mediumCount: number,
  lowCount: number
): number {
  // Weight: Critical = 40, High = 20, Medium = 10, Low = 5
  const weighted = criticalCount * 40 + highCount * 20 + mediumCount * 10 + lowCount * 5;

  // Normalize to 0-100 scale (cap at 100)
  return Math.min(100, weighted);
}

export function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 80) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}
