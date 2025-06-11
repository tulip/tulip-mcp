#!/usr/bin/env node

/**
 * Entry point for the Tulip MCP Server
 */

import { TulipMCPServer } from './server/TulipMCPServer.js';
import { logger } from './server/utils/Logger.js';

// Add global error handlers
process.on('uncaughtException', (error) => {
  logger.debug('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.debug('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server with error handling
try {
  const server = new TulipMCPServer();
  server.run().catch((error) => {
    logger.debug('Failed to start server:', error);
    process.exit(1);
  });
} catch (error) {
  logger.debug('Failed to initialize server:', error);
  process.exit(1);
}
