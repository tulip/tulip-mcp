import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ToolSelection } from '../src/server/config/ToolSelection.js';
import { ToolDefinitions } from '../src/server/tools/definitions/index.js';
import { TulipMCPServer } from '../src/server/TulipMCPServer.js';

const definitions = new ToolDefinitions();
const enabled = value => new ToolSelection(value, definitions);

test('a tool type never enables admin (destructive) tools', () => {
  const selection = enabled('table,read-only');
  assert.ok(selection.isToolEnabled('createTableRecord'));
  for (const tool of ['deleteTableRecord', 'deleteAllTableRecords', 'deleteTableQuery', 'deleteTableAggregation']) {
    assert.equal(selection.isToolEnabled(tool), false, tool);
  }
  assert.equal(enabled('station,user').isToolEnabled('archiveStation'), false);
  assert.equal(enabled('station,user').isToolEnabled('createUser'), false);
});

test('admin tools are enabled by the admin category or by name', () => {
  assert.ok(enabled('admin').isToolEnabled('deleteAllTableRecords'));
  assert.ok(enabled('table,deleteTableRecord').isToolEnabled('deleteTableRecord'));
});

test('the default is read-only', () => {
  const selection = enabled(undefined);
  assert.ok(selection.isToolEnabled('listTables'));
  assert.equal(selection.isToolEnabled('createTableRecord'), false);
});

test('app assignment tools belong to the station types', () => {
  const selection = enabled('station-group');
  assert.ok(selection.isToolEnabled('manageStationGroupAppAssignment'));
  assert.ok(enabled('station').isToolEnabled('manageStationAppAssignment'));
});

test('tools/list sends MCP fields with annotations, not internal config', async () => {
  Object.assign(process.env, { TULIP_API_KEY: 'k', TULIP_API_SECRET: 's', TULIP_BASE_URL: 'https://example.tulip.co', ENABLED_TOOLS: 'read-only,write,admin' });
  const server = new TulipMCPServer({ envPath: '/nonexistent/.env' });
  const handler = server.server._requestHandlers.get('tools/list');
  const { tools } = await handler({ method: 'tools/list', params: {} }, {});
  assert.equal(tools.length, definitions.getToolCount());
  for (const tool of tools) assert.deepEqual(Object.keys(tool).sort(), ['annotations', 'description', 'inputSchema', 'name']);
  assert.equal(tools.find(t => t.name === 'listTables').annotations.readOnlyHint, true);
  assert.equal(tools.find(t => t.name === 'deleteAllTableRecords').annotations.destructiveHint, true);
});
