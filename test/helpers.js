/**
 * Test doubles for the Tulip API client
 */

import { ApiClient } from '../src/server/networking/ApiClient.js';

/**
 * An ApiClient whose network call is replaced by a scripted responder. URLs are
 * still built by the real buildUrl, so tests see exactly what would be sent.
 *
 * respond(call) returns the response body or throws, where call is
 * { endpoint, method, query, url }.
 */
export function fakeApiClient(respond, { workspaceId } = {}) {
  const client = new ApiClient(
    {
      apiKey: 'key',
      apiSecret: 'secret',
      baseUrl: 'https://example.tulip.co',
      workspaceId,
      isWorkspaceApiKey: !workspaceId,
      isAccountApiKey: !!workspaceId,
    },
    { maxRetries: 0, baseDelay: 1, maxDelay: 1 },
  );
  client.calls = [];
  client.makeRequest = async (endpoint, method = 'GET', body = null, queryParams = {}) => {
    const url = client.buildUrl(endpoint, queryParams);
    const query = Object.fromEntries(url.searchParams);
    const call = { endpoint, method, query, url: url.toString() };
    client.calls.push(call);
    return respond(call);
  };
  return client;
}

/**
 * The error ApiClient.makeRequest throws for a non-2xx response.
 */
export function httpError(status, body) {
  return new Error(`HTTP ${status}: ${JSON.stringify(body)}`);
}

export const invalidFieldType = () => httpError(422, { errorCode: 'InvalidFieldType', details: 'Invalid table field type.' });

export const coffeeTable = {
  id: 'T1',
  columns: [
    { name: 'id', dataType: { type: 'string' } },
    { name: 'status', dataType: { type: 'string' } },
    { name: 'qty', dataType: { type: 'integer' } },
    { name: 'started', dataType: { type: 'timestamp' } },
    { name: 'photo', dataType: { type: 'imageUrl' } },
  ],
};
