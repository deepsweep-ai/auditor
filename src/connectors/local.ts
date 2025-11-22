import axios from 'axios';
import type { MCPConnection, MCPSession, MCPServerConfig } from '../types/index.js';
import { RemoteMCPConnector } from './remote.js';

export class LocalMCPConnector implements MCPConnection {
  private config: MCPServerConfig;
  private remoteConnector?: RemoteMCPConnector;
  private detectedPort?: number;

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Auto-detect local MCP server
    const commonPorts = [8000, 8080, 3000, 5000, 8888];

    for (const port of commonPorts) {
      try {
        const url = `http://localhost:${port}`;
        await axios.get(url, { timeout: 1000 });
        this.detectedPort = port;

        // Create a remote connector for the detected port
        this.remoteConnector = new RemoteMCPConnector({
          url,
          ...this.config,
        });

        await this.remoteConnector.connect();
        return;
      } catch (e) {
        // Try next port
      }
    }

    throw new Error('No MCP server detected on common local ports (8000, 8080, 3000, 5000, 8888)');
  }

  async getSession(): Promise<MCPSession> {
    if (!this.remoteConnector) {
      throw new Error('Not connected. Call connect() first.');
    }
    return this.remoteConnector.getSession();
  }

  async disconnect(): Promise<void> {
    if (this.remoteConnector) {
      await this.remoteConnector.disconnect();
      this.remoteConnector = undefined;
    }
  }

  getDetectedPort(): number | undefined {
    return this.detectedPort;
  }
}
