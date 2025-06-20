#!/usr/bin/env node

/**
 * Entry point for the Tulip MCP Server
 */

import minimist from 'minimist';
import { TulipMCPServer } from './server/TulipMCPServer.js';
import { logger } from './server/utils/Logger.js';

// Add global error handlers
process.on('uncaughtException', (error) => {
  logger.debug('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse command-line arguments
const argv = minimist(process.argv.slice(2));

// Start the server with error handling
try {
  // Pass the --env path if it exists
  const server = new TulipMCPServer({ envPath: argv.env });
  server.run().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} catch (error) {
  logger.debug('Failed to initialize server:', error);
  process.exit(1);
}
