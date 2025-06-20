/**
 * Main Tulip MCP Server class
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { logger } from './utils/Logger.js';
import { Environment } from './config/Environment.js';
import { ToolSelection } from './config/ToolSelection.js';
import { ApiClient } from './networking/ApiClient.js';
import { ToolDefinitions } from './tools/definitions/index.js';
import { ToolHandlers } from './tools/ToolHandlers.js';

/**
 * Main Tulip MCP Server class that orchestrates all components
 */
export class TulipMCPServer {
  constructor({ envPath } = {}) {
    this.initializeComponents({ envPath });
    this.setupHandlers();
  }

  initializeComponents({ envPath }) {
    // Load environment configuration
    this.environment = new Environment({ envPath });

    // Initialize tool definitions first (required by tool selection)
    this.toolDefinitions = new ToolDefinitions();

    // Initialize tool selection with environment config and tool definitions
    this.toolSelection = new ToolSelection(
      this.environment.getEnabledTools(),
      this.toolDefinitions
    );

    // Initialize API client
    this.apiClient = new ApiClient(
      this.environment.getApiConfig(),
      this.environment.getRateLimitConfig()
    );

    // Initialize tool handlers
    this.toolHandlers = new ToolHandlers(this.apiClient, this.toolSelection);

    // Initialize MCP server
    this.server = new Server(
      this.environment.getServerInfo(),
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      // Get all tool definitions and filter by enabled tools
      const allTools = this.toolDefinitions.getAllToolDefinitions();
      const enabledTools = allTools.filter(tool => this.toolSelection.isToolEnabled(tool.name));

      return {
        tools: enabledTools,
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.toolHandlers.handleToolCall(name, args);
    });
  }

  async run() {
    try {
      return new Promise((resolve, reject) => {
        const transport = new StdioServerTransport();
        this.server.connect(transport).then(() => {
          logger.debug('Tulip MCP server running on stdio');
        }).catch((stdinError) => {
          console.error(`❌ Failed to start stdio transport:`, stdinError);
          resolve();
        });
        this.server.onclose = () => {
          logger.debug('Tulip MCP server closed');
          resolve();
        }
      });
    } catch (error) {
      console.error(`❌ Error in MCP server run():`, error);
      throw error;
    }
  }
}
