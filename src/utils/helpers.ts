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

  // Use asymptotic scaling to prevent early saturation
  // Formula: score = 100 * (1 - e^(-weighted/threshold))
  // This creates a curve that approaches 100 but provides better differentiation:
  // - 1 critical (40) ≈ 20 points
  // - 3 critical (120) ≈ 49 points
  // - 5 critical (200) ≈ 67 points
  // - 10 critical (400) ≈ 89 points
  const threshold = 180;
  const score = 100 * (1 - Math.exp(-weighted / threshold));

  // Round to nearest integer and cap at 100
  return Math.min(100, Math.round(score));
}

export function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 80) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  return 'LOW';
}
