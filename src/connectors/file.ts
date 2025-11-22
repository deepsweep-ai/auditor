import { readFile } from 'fs/promises';
import type { MCPConnection, MCPSession, MCPServerConfig } from '../types/index.js';

export class FileMCPConnector implements MCPConnection {
  private config: MCPServerConfig;
  private session?: MCPSession;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.file) {
      throw new Error('File MCP connector requires a file path');
    }

    try {
      const content = await readFile(this.config.file, 'utf-8');
      const data = JSON.parse(content);

      this.session = {
        messages: data.messages || [],
        memory: data.memory || data.context || [],
        tools: data.tools || [],
        metadata: data.metadata || {},
      };
    } catch (error: any) {
      throw new Error(`Failed to load session file: ${error.message}`);
    }
  }

  async getSession(): Promise<MCPSession> {
    if (!this.session) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.session;
  }

  async disconnect(): Promise<void> {
    this.session = undefined;
  }
}
