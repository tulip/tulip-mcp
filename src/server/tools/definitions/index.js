/**
 * Tool definitions and schemas for the Tulip MCP server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tool definitions class that dynamically loads tool schemas from JSON files
 */
export class ToolDefinitions {
  constructor() {
    this.toolDefinitions = this.loadToolDefinitions();
  }

  /**
   * Load all tool definitions from individual JSON files
   */
  loadToolDefinitions() {
    const definitionsDir = __dirname; // Now we're already in the definitions directory

    // Check if definitions directory exists
    if (!fs.existsSync(definitionsDir)) {
      throw new Error(`Tool definitions directory not found: ${definitionsDir}`);
    }

    const toolDefinitions = [];

    try {
      // Read all JSON files from the definitions directory
      const files = fs.readdirSync(definitionsDir)
        .filter(file => file.endsWith('.json') && !file.startsWith('_'))
        .sort(); // Sort for consistent ordering

      for (const file of files) {
        try {
          const filePath = path.join(definitionsDir, file);
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const toolDefinition = JSON.parse(fileContent);

          // Validate that the tool definition has required fields
          if (!toolDefinition.name || !toolDefinition.description || !toolDefinition.inputSchema) {
            console.warn(`⚠️ Invalid tool definition in ${file}: missing required fields`);
            continue;
          }

          toolDefinitions.push(toolDefinition);
        } catch (error) {
          console.warn(`⚠️ Failed to load tool definition from ${file}: ${error.message}`);
        }
      }

      console.error(`📚 Loaded ${toolDefinitions.length} tool definitions from JSON files`);

    } catch (error) {
      throw new Error(`Failed to load tool definitions: ${error.message}`);
    }

    return toolDefinitions;
  }

  /**
   * Get all tool definitions
   */
  getAllToolDefinitions() {
    return this.toolDefinitions;
  }

  /**
   * Get a specific tool definition by name
   */
  getToolDefinition(toolName) {
    return this.toolDefinitions.find(tool => tool.name === toolName);
  }

  /**
   * Reload tool definitions from files (useful for development)
   */
  reload() {
    this.toolDefinitions = this.loadToolDefinitions();
    return this.toolDefinitions;
  }

  /**
   * Get tool names sorted alphabetically
   */
  getToolNames() {
    return this.toolDefinitions.map(tool => tool.name).sort();
  }

  /**
   * Get tool count
   */
  getToolCount() {
    return this.toolDefinitions.length;
  }
}
