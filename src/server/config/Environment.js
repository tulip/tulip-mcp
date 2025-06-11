/**
 * Environment configuration and validation for the Tulip MCP server
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { logger } from '../utils/Logger.js';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the project root
const envPath = path.join(__dirname, '../../../.env');
const result = dotenv.config({ path: envPath });

// Debug environment loading
if (result.error) {
  console.error('Error loading .env file:', result.error.message);
  console.error('Looking for .env file at:', envPath);
} else {
  // Env file loaded successfully
}

/**
 * Environment configuration class that handles all environment variable loading and validation
 */
export class Environment {
  constructor() {
    this.loadConfiguration();
    this.validateConfiguration();
    this.logConfiguration();
  }

  loadConfiguration() {
    // Core Tulip API configuration
    this.apiKey = process.env.TULIP_API_KEY;
    this.apiSecret = process.env.TULIP_API_SECRET;
    this.baseUrl = process.env.TULIP_BASE_URL;
    this.workspaceId = process.env.TULIP_WORKSPACE_ID;

    // MCP server configuration
    this.serverName = process.env.MCP_SERVER_NAME || 'tulip-mcp';
    this.serverVersion = process.env.MCP_SERVER_VERSION || '1.0.0';

    // Rate limiting configuration
    this.maxRetries = parseInt(process.env.MCP_MAX_RETRIES) || 3;
    this.baseDelay = parseInt(process.env.MCP_BASE_DELAY) || 1000;
    this.maxDelay = parseInt(process.env.MCP_MAX_DELAY) || 30000;

    // Tool selection configuration
    this.enabledTools = process.env.ENABLED_TOOLS;

    // Determine API key type based on workspace ID presence
    this.isWorkspaceApiKey = !this.workspaceId || this.workspaceId === '';
    this.isAccountApiKey = !this.isWorkspaceApiKey;
  }

  validateConfiguration() {
    if (!this.apiKey || !this.apiSecret || !this.baseUrl) {
      const missing = [];
      if (!this.apiKey) missing.push('TULIP_API_KEY');
      if (!this.apiSecret) missing.push('TULIP_API_SECRET');
      if (!this.baseUrl) missing.push('TULIP_BASE_URL');
      
      logger.debug('Environment variables found:');
      logger.debug('  TULIP_API_KEY:', this.apiKey ? '[SET]' : '[MISSING]');
      logger.debug('  TULIP_API_SECRET:', this.apiSecret ? '[SET]' : '[MISSING]');
      logger.debug('  TULIP_BASE_URL:', this.baseUrl ? '[SET]' : '[MISSING]');
      logger.debug('  TULIP_WORKSPACE_ID:', this.workspaceId ? '[SET]' : '[NOT SET]');
      
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }

  logConfiguration() {
    // Log API key type 
    if (this.isWorkspaceApiKey) {
      logger.debug('Using Workspace API Key - no workspace ID in URLs');
    } else {
      logger.debug(`Using Account API Key - workspace ID "${this.workspaceId}" will be included in URLs`);
    }
  }

  // Getter methods for easy access
  getServerInfo() {
    return {
      name: this.serverName,
      version: this.serverVersion,
    };
  }

  getApiConfig() {
    return {
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
      baseUrl: this.baseUrl,
      workspaceId: this.workspaceId,
      isWorkspaceApiKey: this.isWorkspaceApiKey,
      isAccountApiKey: this.isAccountApiKey,
    };
  }

  getRateLimitConfig() {
    return {
      maxRetries: this.maxRetries,
      baseDelay: this.baseDelay,
      maxDelay: this.maxDelay,
    };
  }

  getEnabledTools() {
    return this.enabledTools;
  }
}
