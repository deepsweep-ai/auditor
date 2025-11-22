import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import type { MCPConnection, MCPSession, MCPServerConfig } from '../types/index.js';

export class RemoteMCPConnector implements MCPConnection {
  private config: MCPServerConfig;
  private httpClient?: AxiosInstance;
  private wsClient?: WebSocket;
  private session: MCPSession;

  constructor(config: MCPServerConfig) {
    this.config = config;
    this.session = {
      messages: [],
      memory: [],
      tools: [],
      metadata: {},
    };
  }

  async connect(): Promise<void> {
    if (!this.config.url) {
      throw new Error('Remote MCP connector requires a URL');
    }

    const url = this.config.url;

    // Determine if WebSocket or HTTP
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
      await this.connectWebSocket(url);
    } else {
      this.connectHTTP(url);
    }
  }

  private async connectWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const headers: Record<string, string> = {};

      if (this.config.apiKey) {
        headers['X-API-Key'] = this.config.apiKey;
      } else if (this.config.bearerToken) {
        headers['Authorization'] = `Bearer ${this.config.bearerToken}`;
      }

      this.wsClient = new WebSocket(url, { headers });

      this.wsClient.on('open', () => {
        // Request session data
        this.wsClient?.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'mcp/getSession',
          params: {},
          id: 1
        }));
        resolve();
      });

      this.wsClient.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.result) {
            this.parseSessionData(message.result);
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      this.wsClient.on('error', (error) => {
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.wsClient?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  private connectHTTP(url: string): void {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['X-API-Key'] = this.config.apiKey;
    } else if (this.config.bearerToken) {
      headers['Authorization'] = `Bearer ${this.config.bearerToken}`;
    }

    this.httpClient = axios.create({
      baseURL: url,
      headers,
      timeout: 10000,
    });
  }

  async getSession(): Promise<MCPSession> {
    if (this.wsClient) {
      return this.session;
    }

    if (this.httpClient) {
      try {
        // Try common MCP endpoints
        const endpoints = ['/session', '/mcp/session', '/api/session', '/v1/session'];

        for (const endpoint of endpoints) {
          try {
            const response = await this.httpClient.get(endpoint);
            if (response.data) {
              this.parseSessionData(response.data);
              return this.session;
            }
          } catch (e) {
            // Try next endpoint
          }
        }

        // If no session endpoint works, try to construct from other endpoints
        await this.fetchSessionComponents();
        return this.session;
      } catch (error: any) {
        throw new Error(`Failed to fetch MCP session: ${error.message}`);
      }
    }

    throw new Error('No active connection');
  }

  private async fetchSessionComponents(): Promise<void> {
    if (!this.httpClient) return;

    // Try to get messages
    try {
      const messagesResp = await this.httpClient.get('/messages');
      this.session.messages = messagesResp.data.messages || messagesResp.data || [];
    } catch (e) {
      // Ignore
    }

    // Try to get memory/context
    try {
      const memoryResp = await this.httpClient.get('/memory');
      this.session.memory = memoryResp.data.memory || memoryResp.data || [];
    } catch (e) {
      try {
        const contextResp = await this.httpClient.get('/context');
        this.session.memory = contextResp.data.context || contextResp.data || [];
      } catch (e2) {
        // Ignore
      }
    }

    // Try to get tools
    try {
      const toolsResp = await this.httpClient.get('/tools');
      this.session.tools = toolsResp.data.tools || toolsResp.data || [];
    } catch (e) {
      // Ignore
    }
  }

  private parseSessionData(data: any): void {
    if (data.messages) {
      this.session.messages = Array.isArray(data.messages) ? data.messages : [];
    }
    if (data.memory) {
      this.session.memory = Array.isArray(data.memory) ? data.memory : [];
    } else if (data.context) {
      this.session.memory = Array.isArray(data.context) ? data.context : [];
    }
    if (data.tools) {
      this.session.tools = Array.isArray(data.tools) ? data.tools : [];
    }
    if (data.metadata) {
      this.session.metadata = data.metadata;
    }
  }

  async disconnect(): Promise<void> {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = undefined;
    }
    this.httpClient = undefined;
  }
}
