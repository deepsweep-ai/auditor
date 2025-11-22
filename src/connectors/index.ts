export { RemoteMCPConnector } from './remote.js';
export { FileMCPConnector } from './file.js';
export { LocalMCPConnector } from './local.js';

import type { MCPConnection, MCPServerConfig } from '../types/index.js';
import { RemoteMCPConnector } from './remote.js';
import { FileMCPConnector } from './file.js';
import { LocalMCPConnector } from './local.js';

export function createConnector(config: MCPServerConfig): MCPConnection {
  if (config.file) {
    return new FileMCPConnector(config);
  } else if (config.url) {
    return new RemoteMCPConnector(config);
  } else if (config.docker) {
    // For MVP, docker mode just tries local ports
    return new LocalMCPConnector(config);
  } else {
    // Default to local detection
    return new LocalMCPConnector(config);
  }
}
