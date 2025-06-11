/**
 * Simple debug logger utility for the Tulip MCP server
 */

// debug toggle
const DEBUG_ENABLED = process.env.MCP_DEBUG === 'true';

function debugLog(...args) {
  if (!DEBUG_ENABLED) return;
  console.error('[DEBUG]', ...args);
}

export const logger = {
  debug: debugLog,
};
