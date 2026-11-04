/**
 * API client for the Tulip MCP server with rate limiting and retry logic
 */

import fetch from 'node-fetch';
import { logger } from '../utils/Logger.js';

const IDEMPOTENT_METHODS = new Set(['GET', 'PUT', 'DELETE']);
// Errors raised before the request reached the server, so retrying cannot repeat a write
const NOT_SENT_ERRORS = ['ENOTFOUND', 'ECONNREFUSED', 'ENETUNREACH', 'EAI_AGAIN'];
const DEFAULT_TIMEOUT_MS = 60000;
// v3 endpoints the gateway serves only without a /w/{workspaceId} segment
const UNSCOPED_V3_ENDPOINTS = new Set(['/signURLs', '/attributes/report']);

/**
 * Encode one URL path segment. IDs are user data and may contain characters
 * such as "#", "?" or "/" that would otherwise change which resource is hit,
 * and an empty segment could turn a single-item request into a collection one.
 */
export function pathSegment(value, name = 'id') {
  const text = value === undefined || value === null ? '' : String(value);
  if (text.trim() === '' || text === '.' || text === '..') {
    throw new Error(`${name} is required and must be a non-empty ID (got ${JSON.stringify(value)})`);
  }
  return encodeURIComponent(text);
}

/**
 * API client that handles all HTTP requests to the Tulip API with retry logic and rate limiting
 */
export class ApiClient {
  constructor(apiConfig, rateLimitConfig) {
    this.apiKey = apiConfig.apiKey;
    this.apiSecret = apiConfig.apiSecret;
    this.baseUrl = apiConfig.baseUrl;
    this.workspaceId = apiConfig.workspaceId;
    this.isWorkspaceApiKey = apiConfig.isWorkspaceApiKey;
    this.isAccountApiKey = apiConfig.isAccountApiKey;

    // Rate limiting configuration
    this.maxRetries = rateLimitConfig.maxRetries;
    this.baseDelay = rateLimitConfig.baseDelay;
    this.maxDelay = rateLimitConfig.maxDelay;
    this.timeoutMs = rateLimitConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetch = fetch;
  }

  async makeRequest(endpoint, method = 'GET', body = null, queryParams = {}, customHeaders = {}) {
    const url = this.buildUrl(endpoint, queryParams);

    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

    const options = {
      method,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        ...customHeaders
      },
      // A redirect on a write could replay it on another URL (e.g. a trailing
      // slash redirect turning one DELETE into "delete all"), so only reads follow them
      redirect: method === 'GET' ? 'follow' : 'manual',
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    // Only requests that are safe to repeat are retried after a server error
    // or a dropped connection; anything else could apply a write twice
    const idempotent = IDEMPOTENT_METHODS.has(method);
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      let response;
      try {
        response = await this.fetch(url.toString(), { ...options, signal: AbortSignal.timeout(this.timeoutMs) });
      } catch (error) {
        if (attempt < this.maxRetries && this.isRetryableError(error, idempotent)) {
          const delay = this.backoff(attempt);
          logger.debug(`Network error on attempt ${attempt + 1}/${this.maxRetries + 1}: ${error.message}. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          attempt++;
          continue;
        }
        const reason = error.name === 'TimeoutError' ? `timed out after ${this.timeoutMs}ms` : error.message;
        throw new Error(`Request to ${url.toString()} failed after ${attempt + 1} attempt(s): ${reason}`);
      }

      // 429 means the request was not processed, so it is safe to retry for any method
      const retryable = response.status === 429 || (idempotent && response.status >= 500 && response.status < 600);
      if (retryable && attempt < this.maxRetries) {
        let delay = this.backoff(attempt);
        const retryAfter = parseInt(response.headers.get('retry-after'), 10);
        if (response.status === 429 && retryAfter > 0) {
          delay = Math.min(retryAfter * 1000, this.maxDelay);
        }
        logger.debug(`HTTP ${response.status} on attempt ${attempt + 1}/${this.maxRetries + 1}. Retrying in ${Math.round(delay)}ms...`);
        await this.sleep(delay);
        attempt++;
        continue;
      }

      if (response.status >= 300 && response.status < 400) {
        throw new Error(`HTTP ${response.status}: refused to follow a redirect for ${method} ${url.toString()}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}${this.errorHint(errorText)}`);
      }

      // Some endpoints send an empty body (e.g. 204) with a JSON content type
      const text = await response.text();
      const contentType = response.headers.get('content-type');
      if (text && contentType && contentType.includes('application/json')) {
        return JSON.parse(text);
      }
      return text;
    }
  }

  // Exponential backoff with jitter
  backoff(attempt) {
    const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
    return delay + Math.random() * 0.1 * delay;
  }

  // Extra guidance for errors whose fix is a configuration change
  errorHint(errorText) {
    if (/BadRequestMissingWorkspace|Workspace .* not found|NoSuchWorkspace/i.test(errorText)) {
      return ' (Set TULIP_WORKSPACE_ID to the workspace ID shown in your Tulip URL, usually DEFAULT.)';
    }
    return '';
  }

  // Helper method to build the request URL (respects API key type)
  buildUrl(endpoint, queryParams = {}) {
    let fullUrl;

    // Check if this is a next-gen API endpoint
    const isNextGenApi = endpoint.startsWith('/api/stations/v1/') || endpoint.startsWith('/api/users/v1/');

    if (isNextGenApi) {
      // Next-gen APIs: the endpoint already carries any workspace segment
      fullUrl = `${this.baseUrl}${endpoint}`;
    } else {
      // Legacy APIs: add /api/v3 and handle workspace ID
      if (this.isWorkspaceApiKey || UNSCOPED_V3_ENDPOINTS.has(endpoint)) {
        // Workspace API Key: /api/v3/endpoint
        fullUrl = `${this.baseUrl}/api/v3${endpoint}`;
      } else {
        // Account API Key: /api/v3/w/{workspaceId}/endpoint
        fullUrl = `${this.baseUrl}/api/v3/w/${encodeURIComponent(this.workspaceId)}${endpoint}`;
      }
    }

    const url = new URL(fullUrl);

    // Add query parameters. Tulip parses array/object query values (filters,
    // sortOptions, fields) as one JSON value, so encode them here instead of
    // letting URLSearchParams turn them into "[object Object]".
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    });

    return url;
  }

  // Whether a failed request may be retried. Timeouts and dropped connections
  // may have reached the server, so only idempotent requests retry those.
  isRetryableError(error, idempotent = true) {
    const matches = codes => codes.some(code => error.message?.includes(code) || error.code === code || error.cause?.code === code);
    if (matches(NOT_SENT_ERRORS)) return true;
    return idempotent && (error.name === 'TimeoutError' || matches(['ECONNRESET', 'ETIMEDOUT', 'fetch failed']));
  }

  // Helper method for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Next-gen Stations API URL. This API always needs the workspace in the
  // path, whatever the key type, so default to the DEFAULT workspace.
  createNextGenApiUrl(endpoint) {
    return `/api/stations/v1/w/${encodeURIComponent(this.workspaceId || 'DEFAULT')}${endpoint}`;
  }

  // Helper method to create next-gen Users API URLs (never includes workspace ID)
  createNextGenUsersApiUrl(endpoint) {
    // Users API never uses workspace ID, regardless of API key type
    // Format: /api/users/v1/roles, /api/users/v1/users, etc.
    return `/api/users/v1${endpoint}`;
  }
}
