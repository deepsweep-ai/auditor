import { describe, it, expect } from 'vitest';
import { calculateRiskScore, getRiskLevel, generateAuditId, generateFindingId } from './helpers.js';

describe('helpers', () => {
  describe('calculateRiskScore', () => {
    it('should calculate risk score correctly', () => {
      expect(calculateRiskScore(1, 0, 0, 0)).toBe(40);
      expect(calculateRiskScore(0, 1, 0, 0)).toBe(20);
      expect(calculateRiskScore(0, 0, 1, 0)).toBe(10);
      expect(calculateRiskScore(0, 0, 0, 1)).toBe(5);
      expect(calculateRiskScore(1, 1, 1, 1)).toBe(75);
    });

    it('should cap risk score at 100', () => {
      expect(calculateRiskScore(10, 10, 10, 10)).toBe(100);
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
