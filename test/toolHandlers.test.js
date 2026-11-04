import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ToolDefinitions } from '../src/server/tools/definitions/index.js';
import { ToolHandlers } from '../src/server/tools/ToolHandlers.js';
import { fakeApiClient } from './helpers.js';

const definitions = new ToolDefinitions();
const allEnabled = { isValidTool: () => true, isToolEnabled: () => true, isToolDangerous: () => false, toolDefinitions: definitions };

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

const call = async (name, args, respond = () => ({})) => {
  const api = fakeApiClient(respond, { workspaceId: 'DEFAULT' });
  const response = await new ToolHandlers(api, allEnabled).handleToolCall(name, args);
  return { api, response, text: response.content[0].text };
};

test('missing required arguments fail before any request is sent', async () => {
  const { api, response, text } = await call('deleteTableRecord', { tableId: 'T1' });
  assert.equal(response.isError, true);
  assert.match(text, /Missing required argument\(s\): recordId/);
  assert.equal(api.calls.length, 0);
});

test('record IDs with "#", "?" or "/" address that exact record', async () => {
  const { api } = await call('deleteTableRecord', { tableId: 'T1', recordId: 'PO#1/2?x' }, () => ({ id: 'PO#1/2?x' }));
  assert.equal(api.calls[0].url, 'https://example.tulip.co/api/v3/w/DEFAULT/tables/T1/records/PO%231%2F2%3Fx');
});

test('deleting a record that does not exist says so', async () => {
  assert.match((await call('deleteTableRecord', { tableId: 'T1', recordId: 'nope' }, () => '')).text, /No record found/);
});

test('writes with an empty 204 response report success', async () => {
  assert.deepEqual(JSON.parse((await call('deleteTableQuery', { tableId: 'T1', queryId: 'Q' }, () => '')).text), { success: true });
});

test('request shapes match the API', async () => {
  const sent = async (name, args) => {
    const api = fakeApiClient(() => ({}), { workspaceId: 'DEFAULT' });
    const bodies = [];
    const original = api.makeRequest;
    api.makeRequest = (endpoint, method, body, query) => { bodies.push({ body, query }); return original(endpoint, method, body, query); };
    await new ToolHandlers(api, allEnabled).handleToolCall(name, args);
    return { ...bodies[0], ...api.calls[0] };
  };

  let r = await sent('reportAttributes', { attributes: [{ machineId: 'm', attributeId: 'a', value: 1 }] });
  assert.deepEqual(r.body, { attributes: [{ machineId: 'm', attributeId: 'a', value: 1 }] });

  r = await sent('updateStationGroupStations', { stationGroupId: 'G', add: ['s1'], remove: ['s2'] });
  assert.deepEqual(r.body, { add: ['s1'], remove: ['s2'] });

  r = await sent('updateInterfaceStationAssignment', { interfaceId: 'I', stationId: 'S', replaceInterfaceAtStation: true });
  assert.deepEqual(r.body, { stationId: 'S' });
  assert.equal(r.query.replaceInterfaceAtStation, 'true');

  r = await sent('deleteInterfaceStationAssignment', { interfaceId: 'I' });
  assert.equal(r.endpoint, '/api/stations/v1/w/DEFAULT/interfaces/I/station-assignment');

  r = await sent('listUsers', { limit: 50, offset: 100, archived: true });
  assert.deepEqual(r.query, { limit: '50', offset: '100', archived: 'true' });

  r = await sent('manageStationAppAssignment', { stationId: 'S', appAssignmentId: 'A', type: 'app-version', appId: 'app', appVersionId: 'v' });
  assert.deepEqual(r.body, { type: 'app-version', appId: 'app', appVersionId: 'v' });

  r = await sent('createTableQuery', { tableId: 'T1', label: 'Open', limit: 10 });
  assert.deepEqual(r.body, { label: 'Open', tableId: 'T1', filters: [], filterAggregator: 'all', sortOptions: [], limit: 10 });

  r = await sent('createTableQuery', { tableId: 'T1', label: 'Open', limit: 10, filters: [{ field: 'status', functionType: 'notBlank' }, { _id: 'keep', field: 'qty', functionType: 'blank' }] });
  assert.match(r.body.filters[0]._id, /^[A-Za-z0-9]{17}$/);
  assert.equal(r.body.filters[1]._id, 'keep');

  r = await sent('signUrls', { urls: ['u'] });
  assert.equal(r.url, 'https://example.tulip.co/api/v3/signURLs');
  r = await sent('reportAttributes', { attributes: [] });
  assert.equal(r.url, 'https://example.tulip.co/api/v3/attributes/report');
});

test('updateStationGroupStations with nothing to change is rejected instead of a silent no-op', async () => {
  const { api, response } = await call('updateStationGroupStations', { stationGroupId: 'G' });
  assert.equal(response.isError, true);
  assert.equal(api.calls.length, 0);
});

test('every path parameter in a tool URL is a required, non-empty input', () => {
  for (const def of definitions.getAllToolDefinitions()) {
    for (const [, param] of def.url.matchAll(/:([A-Za-z]+)/g)) {
      const prop = def.inputSchema.properties?.[param];
      assert.ok(prop, `${def.name}: no input for :${param}`);
      assert.ok(def.inputSchema.required?.includes(param), `${def.name}: ${param} not required`);
      assert.equal(prop.minLength, 1, `${def.name}: ${param} may be empty`);
    }
  }
});
