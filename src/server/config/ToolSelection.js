/**
 * Tool selection and categorization for the Tulip MCP server
 */

import { logger } from '../utils/Logger.js';

/**
 * Tool selection manager that handles tool categorization, validation, and filtering
 */
export class ToolSelection {
  constructor(enabledToolsEnv, toolDefinitions) {
    this.toolDefinitions = toolDefinitions;
    this.initializeToolDefinitions();
    this.initializeToolSelection(enabledToolsEnv);
    this.logToolSelection();
  }

  initializeToolDefinitions() {
    // Build categorization data dynamically from tool definitions
    this.toolCategories = {};
    this.toolTypes = {};
    this.dangerousTools = new Set();

    // Get all tool definitions
    const allToolDefinitions = this.toolDefinitions.getAllToolDefinitions();

    // Build categories and types maps
    for (const toolDef of allToolDefinitions) {
      const { name, category, type, dangerous } = toolDef;

      // Build tool categories
      if (category) {
        if (!this.toolCategories[category]) {
          this.toolCategories[category] = [];
        }
        this.toolCategories[category].push(name);
      }

      // Build tool types
      if (type) {
        if (!this.toolTypes[type]) {
          this.toolTypes[type] = [];
        }
        this.toolTypes[type].push(name);
      }

      // Build dangerous tools set
      if (dangerous) {
        this.dangerousTools.add(name);
      }
    }

    // Sort arrays for consistent ordering
    for (const category in this.toolCategories) {
      this.toolCategories[category].sort();
    }
    for (const type in this.toolTypes) {
      this.toolTypes[type].sort();
    }

    logger.debug(`🏗️ Built categorization from ${allToolDefinitions.length} tool definitions:`);
    logger.debug(`  Categories: ${Object.keys(this.toolCategories).join(', ')}`);
    logger.debug(`  Types: ${Object.keys(this.toolTypes).join(', ')}`);
    logger.debug(`  Dangerous tools: ${this.dangerousTools.size}`);
  }

  initializeToolSelection(enabledToolsEnv) {
    // Parse tool selection from environment variables
    this.enabledTools = new Set();
    this.enabledToolCategories = new Set();
    this.enabledToolTypes = new Set();

    // Single unified environment variable: ENABLED_TOOLS
    if (enabledToolsEnv) {
      const toolList = enabledToolsEnv.split(',').map(item => item.trim()).filter(Boolean);
      
      toolList.forEach(item => {
        // Check if it's an individual tool
        if (this.isValidTool(item)) {
          this.enabledTools.add(item);
        }
        // Check if it's a tool category
        else if (this.toolCategories[item]) {
          this.enabledToolCategories.add(item);
          this.toolCategories[item].forEach(tool => {
            this.enabledTools.add(tool);
          });
        }
        // Check if it's a tool type
        else if (this.toolTypes[item]) {
          this.enabledToolTypes.add(item);
          this.toolTypes[item].forEach(tool => {
            this.enabledTools.add(tool);
          });
        }
        else {
          logger.debug(`Warning: Unknown tool, category, or type: '${item}'`);
          logger.debug(`  Available categories: ${Object.keys(this.toolCategories).join(', ')}`);
          logger.debug(`  Available types: ${Object.keys(this.toolTypes).join(', ')}`);
          logger.debug(`  Use individual tool names for specific tools`);
        }
      });
    }

    // Default: If nothing specified, enable only read-only table tools for safety
    if (this.enabledTools.size === 0) {
      this.enabledToolCategories.add('read-only');
      if (this.toolCategories['read-only']) {
        this.toolCategories['read-only'].forEach(tool => {
          this.enabledTools.add(tool);
        });
      }
      
      logger.debug('No tools specified - defaulting to read-only tools');
    }
  }

  logToolSelection() {
    // Log comprehensive tool selection configuration
    const enabledCategories = Array.from(this.enabledToolCategories);
    const enabledTypes = Array.from(this.enabledToolTypes);
    const enabledToolNames = Array.from(this.enabledTools).sort();
    
    let toolSelectionLog = `Tool selection: ${this.enabledTools.size} tools enabled`;
    if (enabledCategories.length > 0) {
      toolSelectionLog += `\n  Categories: ${enabledCategories.join(', ')}`;
    }
    if (enabledTypes.length > 0) {
      toolSelectionLog += `\n  Types: ${enabledTypes.join(', ')}`;
    }
    toolSelectionLog += `\n  Enabled tools: ${enabledToolNames.join(', ')}`;
    
    logger.debug(toolSelectionLog);
  }

  // Helper methods for tool management
  isValidTool(toolName) {
    return this.getAllToolNames().includes(toolName);
  }

  getAllToolNames() {
    return this.toolDefinitions.getToolNames();
  }

  isToolEnabled(toolName) {
    return this.enabledTools.has(toolName);
  }

  isToolDangerous(toolName) {
    return this.dangerousTools.has(toolName);
  }

  getToolCategory(toolName) {
    for (const [category, tools] of Object.entries(this.toolCategories)) {
      if (tools.includes(toolName)) {
        return category;
      }
    }
    return 'unknown';
  }

  getToolType(toolName) {
    for (const [type, tools] of Object.entries(this.toolTypes)) {
      if (tools.includes(toolName)) {
        return type;
      }
    }
    return 'unknown';
  }

  getAvailableToolTypes() {
    return Object.keys(this.toolTypes);
  }

  getAvailableToolCategories() {
    return Object.keys(this.toolCategories);
  }

  getEnabledTools() {
    return this.enabledTools;
  }

  getEnabledToolCategories() {
    return this.enabledToolCategories;
  }

  getEnabledToolTypes() {
    return this.enabledToolTypes;
  }

  // Additional helper methods for accessing categorization data
  getToolsByCategory(category) {
    return this.toolCategories[category] || [];
  }

  getToolsByType(type) {
    return this.toolTypes[type] || [];
  }

  getDangerousTools() {
    return Array.from(this.dangerousTools);
  }
}
