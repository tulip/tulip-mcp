import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ApiClient } from '../src/server/networking/ApiClient.js';

function client(workspaceId) {
  return new ApiClient(
    { apiKey: 'k', apiSecret: 's', baseUrl: 'https://example.tulip.co', workspaceId, isWorkspaceApiKey: !workspaceId },
    { maxRetries: 0, baseDelay: 1, maxDelay: 1 },
  );
}

test('array and object query values are sent as one JSON value, never "[object Object]"', () => {
  const filters = [{ field: 'status', functionType: 'equal', arg: 'OPEN' }];
  const sortOptions = [{ sortBy: '_createdAt', sortDir: 'desc' }];
  const url = client().buildUrl('/tables/T1/runAggregation', { filters, sortOptions, fields: ['a', 'b'] });

  assert.ok(!url.toString().includes('object+Object') && !url.toString().includes('object%20Object'));
  assert.deepEqual(url.searchParams.getAll('filters'), [JSON.stringify(filters)]);
  assert.deepEqual(url.searchParams.getAll('sortOptions'), [JSON.stringify(sortOptions)]);
  assert.deepEqual(url.searchParams.getAll('fields'), ['["a","b"]']);
});

test('primitive query values are unchanged and null/undefined are dropped', () => {
  const url = client().buildUrl('/tables/T1/records', { limit: 5, offset: 0, filterAggregator: 'all', a: null, b: undefined });
  assert.equal(url.search, '?limit=5&offset=0&filterAggregator=all');
});

test('already-encoded JSON strings pass through untouched', () => {
  const encoded = '[{"sortBy":"_createdAt","sortDir":"desc"}]';
  const url = client().buildUrl('/tables/T1/records', { sortOptions: encoded });
  assert.equal(url.searchParams.get('sortOptions'), encoded);
});

test('workspace and account keys build the expected v3 paths', () => {
  assert.equal(client().buildUrl('/tables').pathname, '/api/v3/tables');
  assert.equal(client('DEFAULT').buildUrl('/tables').pathname, '/api/v3/w/DEFAULT/tables');
  assert.equal(client('DEFAULT').buildUrl('/api/users/v1/users').pathname, '/api/users/v1/users');
});
