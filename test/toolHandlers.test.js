import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ToolDefinitions } from '../src/server/tools/definitions/index.js';
import { ToolHandlers } from '../src/server/tools/ToolHandlers.js';
import { fakeApiClient } from './helpers.js';

const allEnabled = { isToolEnabled: () => true, isToolDangerous: () => false };

// A sample value for each schema property, so every tool can be called with
// every argument filled in
function sample(schema) {
  if (schema.enum) return schema.enum[0];
  switch (schema.type) {
    case 'array': return [sample(schema.items || { type: 'string' })];
    case 'object': return Object.fromEntries(Object.entries(schema.properties || { k: { type: 'string' } }).map(([k, v]) => [k, sample(v)]));
    case 'integer':
    case 'number': return 1;
    case 'boolean': return true;
    default: return 'x';
  }
}

test('no GET tool sends "[object Object]" in its query string', async () => {
  const definitions = new ToolDefinitions().getAllToolDefinitions().filter(d => d.httpType === 'GET');
  assert.ok(definitions.length > 20);
  for (const def of definitions) {
    const api = fakeApiClient(({ endpoint }) => (endpoint.endsWith('/count') ? 1 : endpoint.endsWith('/records') ? [] : { result: 1, columns: [] }));
    const args = Object.fromEntries(Object.entries(def.inputSchema.properties || {}).map(([k, v]) => [k, sample(v)]));
    await new ToolHandlers(api, allEnabled).handleToolCall(def.name, args);
    for (const { url } of api.calls) assert.ok(!/object(\+|%20)Object/.test(url), `${def.name}: ${url}`);
  }
});

test('read notes are returned as extra text content after the JSON result', async () => {
  const api = fakeApiClient(({ endpoint }) => (endpoint.endsWith('/count') ? 1109 : { result: 5 }));
  const response = await new ToolHandlers(api, allEnabled).handleToolCall('runTableAggregation', { tableId: 'T1', function: 'count', fieldId: 'id', limit: 100 });
  assert.equal(response.isError, undefined);
  const body = JSON.parse(response.content[0].text);
  assert.equal(body.result, 5);
  assert.equal(body.truncated, true);
  assert.match(response.content[1].text, /^Note: Only the 100 newest of 1109/);
});

test('listTableRecords still returns the records array as the JSON result', async () => {
  const api = fakeApiClient(() => [{ id: '1' }]);
  const response = await new ToolHandlers(api, allEnabled).handleToolCall('listTableRecords', { tableId: 'T1', limit: 5 });
  assert.deepEqual(JSON.parse(response.content[0].text), [{ id: '1' }]);
  assert.equal(response.content.length, 1);
});
