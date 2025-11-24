import { describe, it, expect } from 'vitest';
import { calculateRiskScore, getRiskLevel, generateAuditId, generateFindingId } from './helpers.js';

describe('helpers', () => {
  describe('calculateRiskScore', () => {
    it('should calculate risk score with asymptotic scaling', () => {
      // New asymptotic formula: score = 100 * (1 - e^(-weighted/180))
      // This prevents early saturation and provides better differentiation
      expect(calculateRiskScore(1, 0, 0, 0)).toBe(20); // 1 critical ≈ 20 points
      expect(calculateRiskScore(0, 1, 0, 0)).toBe(11); // 1 high ≈ 11 points
      expect(calculateRiskScore(0, 0, 1, 0)).toBe(5);  // 1 medium ≈ 5 points
      expect(calculateRiskScore(0, 0, 0, 1)).toBe(3);  // 1 low ≈ 3 points
      expect(calculateRiskScore(1, 1, 1, 1)).toBe(34); // Mixed severity ≈ 34 points
    });

    it('should approach but not easily reach 100', () => {
      // With many findings, score approaches 100 asymptotically
      expect(calculateRiskScore(10, 10, 10, 10)).toBe(98); // Heavy findings ≈ 98 points
      expect(calculateRiskScore(20, 0, 0, 0)).toBe(99); // 20 critical ≈ 99 points
    });

    it('should provide better differentiation for critical findings', () => {
      // Verify the curve provides good differentiation across severity levels
      expect(calculateRiskScore(3, 0, 0, 0)).toBe(49);  // 3 critical ≈ 49 points (MEDIUM/HIGH boundary)
      expect(calculateRiskScore(5, 0, 0, 0)).toBe(67);  // 5 critical ≈ 67 points (HIGH)
      expect(calculateRiskScore(10, 0, 0, 0)).toBe(89); // 10 critical ≈ 89 points (CRITICAL)
    });
  });

  describe('getRiskLevel', () => {
    it('should return correct risk levels', () => {
      expect(getRiskLevel(95)).toBe('CRITICAL');
      expect(getRiskLevel(80)).toBe('CRITICAL');
      expect(getRiskLevel(70)).toBe('HIGH');
      expect(getRiskLevel(50)).toBe('HIGH');
      expect(getRiskLevel(30)).toBe('MEDIUM');
      expect(getRiskLevel(20)).toBe('MEDIUM');
      expect(getRiskLevel(10)).toBe('LOW');
      expect(getRiskLevel(0)).toBe('LOW');
    });
  });

  describe('generateAuditId', () => {
    it('should generate unique audit IDs', () => {
      const id1 = generateAuditId();
      const id2 = generateAuditId();
      expect(id1).toMatch(/^audit_\d+_[a-f0-9]+$/);
      expect(id2).toMatch(/^audit_\d+_[a-f0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateFindingId', () => {
    it('should generate unique finding IDs', () => {
      const id1 = generateFindingId();
      const id2 = generateFindingId();
      expect(id1).toMatch(/^finding_\d+_[a-f0-9]+$/);
      expect(id2).toMatch(/^finding_\d+_[a-f0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
