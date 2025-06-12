#!/usr/bin/env node

/**
 * Generate tools.md documentation from JSON tool definitions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the definitions directory
const DEFINITIONS_DIR = path.join(__dirname, 'src/server/tools/definitions');

/**
 * Load all tool definitions from JSON files
 */
function loadToolDefinitions() {
  const toolDefinitions = [];
  
  try {
    const files = fs.readdirSync(DEFINITIONS_DIR)
      .filter(file => file.endsWith('.json') && !file.startsWith('_'))
      .sort();
    
    for (const file of files) {
      try {
        const filePath = path.join(DEFINITIONS_DIR, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const toolDefinition = JSON.parse(fileContent);
        toolDefinitions.push(toolDefinition);
      } catch (error) {
        console.warn(`⚠️ Failed to load tool definition from ${file}: ${error.message}`);
      }
    }
    
    console.log(`📚 Loaded ${toolDefinitions.length} tool definitions`);
    
  } catch (error) {
    throw new Error(`Failed to load tool definitions: ${error.message}`);
  }
  
  return toolDefinitions;
}

/**
 * Group tools by their API category
 */
function groupToolsByCategory(tools) {
  const groups = {
    'Tables & Records API': [],
    'Machines API': [],
    'Apps API': [],
    'Stations API (Next-Gen)': {
      'Interfaces': [],
      'Station Groups': [],
      'Stations': []
    },
    'Users API (Next-Gen)': {
      'User Roles': [],
      'User Groups': [],
      'Users': []
    },
    'Utilities API': []
  };

  for (const tool of tools) {
    const { type, name, category } = tool;
    
    // Categorize based on type and name patterns
    if (type === 'table') {
      groups['Tables & Records API'].push(tool);
    } else if (type === 'machine') {
      groups['Machines API'].push(tool);
    } else if (type === 'app') {
      groups['Apps API'].push(tool);
    } else if (type === 'interface') {
      groups['Stations API (Next-Gen)']['Interfaces'].push(tool);
    } else if (type === 'station-group') {
      groups['Stations API (Next-Gen)']['Station Groups'].push(tool);
    } else if (type === 'station') {
      groups['Stations API (Next-Gen)']['Stations'].push(tool);
    } else if (type === 'user') {
      if (name.includes('Role')) {
        groups['Users API (Next-Gen)']['User Roles'].push(tool);
      } else if (name.includes('Group') || name.includes('UserGroups')) {
        groups['Users API (Next-Gen)']['User Groups'].push(tool);
      } else {
        groups['Users API (Next-Gen)']['Users'].push(tool);
      }
    } else if (type === 'utility') {
      groups['Utilities API'].push(tool);
    } else {
      // Default fallback - add to most appropriate category
      if (name.includes('machine') || name.includes('Machine')) {
        groups['Machines API'].push(tool);
      } else if (name.includes('table') || name.includes('Table')) {
        groups['Tables & Records API'].push(tool);
      } else {
        groups['Utilities API'].push(tool);
      }
    }
  }

  return groups;
}

/**
 * Format parameter information
 */
function formatParameters(inputSchema) {
  if (!inputSchema || !inputSchema.properties) {
    return '**Parameters**: None';
  }

  const { properties, required = [] } = inputSchema;
  const params = [];

  for (const [name, config] of Object.entries(properties)) {
    const isRequired = required.includes(name);
    const type = config.type || 'string';
    const description = config.description || '';
    
    const requiredText = isRequired ? 'required' : 'optional';
    params.push(`- \`${name}\` (${type}, ${requiredText}): ${description}`);
  }

  return `**Parameters**:\n${params.join('\n')}`;
}

/**
 * Generate markdown for a single tool
 */
function generateToolMarkdown(tool) {
  const { name, description, url, httpType, dangerous, inputSchema } = tool;
  
  // Add [ADMIN] marker for dangerous operations
  const adminMarker = dangerous ? ' [ADMIN]' : '';
  
  // Extract scope from description if present
  const scopeMatch = description.match(/Requires `([^`]+)` scope/);
  const scope = scopeMatch ? scopeMatch[1] : 'unknown';
  
  // Clean description (remove scope and endpoint info)
  let cleanDescription = description
    .replace(/\s*Corresponds to [^.]+\.\s*/, '')
    .replace(/\s*Requires `[^`]+` scope\.\s*/, '')
    .replace(/\s*\[[\w-]+\]\s*$/, '')
    .replace(/^⚠️ ADMIN OPERATION ⚠️\s*/, '');

  // Convert URL format from :param to {param}
  const endpoint = url ? url.replace(/:(\w+)/g, '{$1}') : '';

  const parametersSection = formatParameters(inputSchema);

  return `#### \`${name}\`${adminMarker}
**Description**: ${cleanDescription}  
**Endpoint**: \`${httpType} ${endpoint}\`  
**Scope**: \`${scope}\`

${parametersSection}

---`;
}

/**
 * Generate markdown for a group of tools
 */
function generateGroupMarkdown(tools, groupName) {
  if (Array.isArray(tools)) {
    if (tools.length === 0) return '';
    
    let markdown = `## ${groupName}\n\n`;
    for (const tool of tools) {
      markdown += generateToolMarkdown(tool) + '\n';
    }
    return markdown;
  }
  
  // Handle nested groups (like Stations API)
  let markdown = `## ${groupName}\n\n`;
  for (const [subGroupName, subTools] of Object.entries(tools)) {
    if (subTools.length === 0) continue;
    
    markdown += `### ${subGroupName}\n\n`;
    for (const tool of subTools) {
      markdown += generateToolMarkdown(tool) + '\n';
    }
  }
  return markdown;
}

/**
 * Generate statistics
 */
function generateStatistics(tools) {
  const totalTools = tools.length;
  const adminOps = tools.filter(t => t.dangerous).length;
  const writeOps = tools.filter(t => t.category === 'write').length;
  const readOps = tools.filter(t => t.category === 'read-only').length;
  
  // Count by type
  const typeCounts = {};
  for (const tool of tools) {
    const type = tool.type || 'other';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  }

  return `## Tool Summary

**Total Tools**: ${totalTools}

**Categories**:
- **Read Operations**: ${readOps} tools
- **Write Operations**: ${writeOps} tools  
- **Admin Operations**: ${adminOps} tools

**API Types**:
- **Tables & Records**: ${typeCounts.table || 0} tools
- **Stations & Interfaces**: ${(typeCounts.station || 0) + (typeCounts.interface || 0) + (typeCounts['station-group'] || 0)} tools
- **Users & Access Control**: ${typeCounts.user || 0} tools
- **Machines**: ${typeCounts.machine || 0} tools
- **Apps**: ${typeCounts.app || 0} tools
- **Utilities**: ${typeCounts.utility || 0} tools`;
}

/**
 * Main function to generate tools.md
 */
function generateToolsMarkdown() {
  console.log('🔄 Generating tools.md from JSON definitions...');
  
  const tools = loadToolDefinitions();
  const groupedTools = groupToolsByCategory(tools);
  
  let markdown = `# Tulip MCP Tools Reference

Complete reference for all ${tools.length} Tulip API tools available through the MCP server.

## Categories

**Admin Operations**: Tools marked as [ADMIN] can permanently delete data or disable resources.

---

`;

  // Generate sections for each group
  for (const [groupName, groupTools] of Object.entries(groupedTools)) {
    const groupMarkdown = generateGroupMarkdown(groupTools, groupName);
    if (groupMarkdown) {
      markdown += groupMarkdown + '\n';
    }
  }

  // Add statistics
  markdown += generateStatistics(tools);

  return markdown;
}

/**
 * Write the generated markdown to tools.md
 */
function writeToolsDoc() {
  try {
    const markdown = generateToolsMarkdown();
    const outputPath = path.join(__dirname, 'tools.md');
    
    fs.writeFileSync(outputPath, markdown, 'utf8');
    console.log(`✅ Successfully generated tools.md with ${markdown.split('\n#### `').length - 1} tools`);
    
  } catch (error) {
    console.error('❌ Error generating tools.md:', error.message);
    process.exit(1);
  }
}

// Run the script
if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])) {
  writeToolsDoc();
}

export { generateToolsMarkdown, loadToolDefinitions, groupToolsByCategory };
