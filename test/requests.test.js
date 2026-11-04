import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { ApiClient, pathSegment } from '../src/server/networking/ApiClient.js';

function client({ workspaceId, responses, maxRetries = 2, timeoutMs } = {}) {
  const api = new ApiClient(
    { apiKey: 'k', apiSecret: 's', baseUrl: 'https://example.tulip.co', workspaceId, isWorkspaceApiKey: !workspaceId },
    { maxRetries, baseDelay: 1, maxDelay: 5, timeoutMs },
  );
  api.sent = [];
  api.fetch = async (url, options) => {
    api.sent.push({ url, method: options.method, redirect: options.redirect });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    const { status = 200, body = '', headers = {} } = next;
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
      status,
      headers: { 'content-type': typeof body === 'string' ? 'text/plain' : 'application/json', ...headers },
    });
  };
  return api;
}
const networkError = code => Object.assign(new Error(`connect ${code}`), { code });

describe('path segments', () => {
  test('IDs are encoded so "#", "?" and "/" cannot change the target', () => {
    assert.equal(pathSegment('PO#123'), 'PO%23123');
    assert.equal(pathSegment('lot?1'), 'lot%3F1');
    assert.equal(pathSegment('A/B'), 'A%2FB');
    assert.equal(pathSegment('Part 001'), 'Part%20001');
  });

  test('empty, "." and ".." are rejected instead of addressing the collection', () => {
    for (const bad of [undefined, null, '', '  ', '.', '..']) {
      assert.throws(() => pathSegment(bad, 'recordId'), /recordId is required/);
    }
  });
});

describe('retries', () => {
  test('a GET is retried after a 5xx', async () => {
    const api = client({ responses: [{ status: 503 }, { body: { ok: 1 } }] });
    assert.deepEqual(await api.makeRequest('/tables'), { ok: 1 });
    assert.equal(api.sent.length, 2);
  });

  test('a POST or PATCH is not retried after a 5xx, so a write is never applied twice', async () => {
    for (const method of ['POST', 'PATCH']) {
      const api = client({ responses: [{ status: 502, body: 'bad gateway' }, { body: {} }] });
      await assert.rejects(api.makeRequest('/tables/T/records', method, {}), /HTTP 502/);
      assert.equal(api.sent.length, 1, method);
    }
  });

  test('a POST is not retried after a dropped connection, but is after a refused one', async () => {
    let api = client({ responses: [networkError('ECONNRESET'), { body: {} }] });
    await assert.rejects(api.makeRequest('/tables/T/records', 'POST', {}), /ECONNRESET/);
    assert.equal(api.sent.length, 1);

    api = client({ responses: [networkError('ECONNREFUSED'), { body: { id: 'r' } }] });
    assert.deepEqual(await api.makeRequest('/tables/T/records', 'POST', {}), { id: 'r' });
    assert.equal(api.sent.length, 2);
  });

  test('429 is retried for any method, honouring Retry-After up to the max delay', async () => {
    const api = client({ responses: [{ status: 429, headers: { 'retry-after': '120' } }, { body: { id: 'r' } }] });
    const started = Date.now();
    assert.deepEqual(await api.makeRequest('/tables/T/records', 'POST', {}), { id: 'r' });
    assert.ok(Date.now() - started < 1000);
  });

  test('MCP_MAX_RETRIES=0 means one attempt', async () => {
    const api = client({ maxRetries: 0, responses: [{ status: 503, body: 'down' }] });
    await assert.rejects(api.makeRequest('/tables'), /HTTP 503/);
    assert.equal(api.sent.length, 1);
  });
});

describe('redirects and timeouts', () => {
  test('writes never follow redirects; reads do', async () => {
    const api = client({ responses: [{ status: 301, headers: { location: '/x' } }] });
    await assert.rejects(api.makeRequest('/tables/T/records/R', 'DELETE'), /refused to follow a redirect/);
    assert.equal(api.sent[0].redirect, 'manual');
    const reader = client({ responses: [{ body: [] }] });
    await reader.makeRequest('/tables');
    assert.equal(reader.sent[0].redirect, 'follow');
  });

  test('a stalled request fails with a timeout instead of hanging', async () => {
    const api = client({ maxRetries: 0, timeoutMs: 20, responses: [] });
    api.fetch = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason)));
    await assert.rejects(api.makeRequest('/tables'), /timed out after 20ms/);
  });
});

describe('workspace URLs', () => {
  test('station URLs always carry a workspace, defaulting to DEFAULT', () => {
    assert.equal(client().createNextGenApiUrl('/stations'), '/api/stations/v1/w/DEFAULT/stations');
    assert.equal(client({ workspaceId: 'ws1' }).createNextGenApiUrl('/stations'), '/api/stations/v1/w/ws1/stations');
  });

  test('a missing-workspace error tells the user what to set', async () => {
    const api = client({ responses: [{ status: 400, body: { errorCode: 'BadRequestMissingWorkspace' } }] });
    await assert.rejects(api.makeRequest('/api/stations/v1/stations'), /Set TULIP_WORKSPACE_ID/);
  });
});

test('an empty body with a JSON content type is returned as empty, not a parse error', async () => {
  const api = client({ responses: [{ status: 200, body: '', headers: { 'content-type': 'application/json' } }] });
  assert.equal(await api.makeRequest('/tables/T/aggregation/A', 'DELETE'), '');
});
