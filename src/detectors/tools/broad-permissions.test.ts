import { describe, it, expect } from 'vitest';
import { BroadPermissionsDetector } from './broad-permissions.js';
import type { MCPSession } from '../../types/index.js';

describe('BroadPermissionsDetector', () => {
  const detector = new BroadPermissionsDetector();

  it('should detect shell access permission', async () => {
    const session: MCPSession = {
      messages: [],
      memory: [],
      tools: [
        {
          name: 'execute_command',
          permissions: ['shell', 'execute'],
        },
      ],
      metadata: {},
    };

    const findings = await detector.detect(session);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('CRITICAL');
    expect(findings[0].category).toBe('tool_poisoning');
  });

  it('should detect file write permission', async () => {
    const session: MCPSession = {
      messages: [],
      memory: [],
      tools: [
        {
          name: 'write_file',
          permissions: ['file_write'],
        },
      ],
      metadata: {},
    };

    const findings = await detector.detect(session);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe('HIGH');
  });

  it('should detect excessive permissions', async () => {
    const session: MCPSession = {
      messages: [],
      memory: [],
      tools: [
        {
          name: 'super_tool',
          permissions: ['read', 'write', 'execute', 'delete', 'admin', 'network'],
        },
      ],
      metadata: {},
    };

    const findings = await detector.detect(session);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('should not flag safe tools', async () => {
    const session: MCPSession = {
      messages: [],
      memory: [],
      tools: [
        {
          name: 'read_only',
          permissions: ['read'],
        },
      ],
      metadata: {},
    };

    const findings = await detector.detect(session);
    expect(findings.length).toBe(0);
  });
});
