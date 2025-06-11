/**
 * API client for the Tulip MCP server with rate limiting and retry logic
 */

import fetch from 'node-fetch';
import { logger } from '../utils/Logger.js';

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
  }

  async makeRequest(endpoint, method = 'GET', body = null, queryParams = {}, customHeaders = {}) {
    // Construct URL based on API key type and endpoint type
    let fullUrl;

    // Check if this is a next-gen API endpoint
    const isNextGenApi = endpoint.startsWith('/api/stations/v1/') || endpoint.startsWith('/api/users/v1/');

    if (isNextGenApi) {
      // Next-gen APIs: workspace ID is embedded in the endpoint itself
      // For Account API keys: /api/stations/v1/w/{workspaceId}/stations
      // For Workspace API keys: /api/stations/v1/stations
      fullUrl = `${this.baseUrl}${endpoint}`;
    } else {
      // Legacy APIs: add /api/v3 and handle workspace ID
      if (this.isWorkspaceApiKey) {
        // Workspace API Key: /api/v3/endpoint
        fullUrl = `${this.baseUrl}/api/v3${endpoint}`;
      } else {
        // Account API Key: /api/v3/w/{workspaceId}/endpoint
        fullUrl = `${this.baseUrl}/api/v3/w/${this.workspaceId}${endpoint}`;
      }
    }

    const url = new URL(fullUrl);

    // Add query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

    const options = {
      method,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        ...customHeaders
      },
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(body);
    }

    // Rate limiting configuration
    let attempt = 0;

    while (attempt <= this.maxRetries) {
      try {
        const response = await fetch(url.toString(), options);

        // Handle rate limiting (429) and temporary server errors (5xx)
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          if (attempt < this.maxRetries) {
            // Calculate exponential backoff delay
            const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);

            // Add some jitter to avoid thundering herd
            const jitter = Math.random() * 0.1 * delay;
            const totalDelay = delay + jitter;

            logger.debug(`Rate limited (${response.status}) on attempt ${attempt + 1}/${this.maxRetries + 1}. Retrying in ${Math.round(totalDelay)}ms...`);

            // Parse Retry-After header if present (common for 429 responses)
            const retryAfter = response.headers.get('retry-after');
            if (retryAfter && response.status === 429) {
              const retryAfterMs = parseInt(retryAfter) * 1000;
              if (retryAfterMs > 0 && retryAfterMs < this.maxDelay) {
                logger.debug(`Using Retry-After header: ${retryAfterMs}ms`);
                await this.sleep(retryAfterMs);
                attempt++;
                continue;
              }
            }

            await this.sleep(totalDelay);
            attempt++;
            continue;
          } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status} after ${this.maxRetries} retries: ${errorText}`);
          }
        }

        // Handle other client errors (4xx) - don't retry these
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // Success - parse response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text();
        }

      } catch (error) {
        // Network errors or fetch failures
        if (attempt < this.maxRetries && this.isRetryableError(error)) {
          const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
          logger.debug(`Network error on attempt ${attempt + 1}/${this.maxRetries + 1}: ${error.message}. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          attempt++;
          continue;
        }

        throw new Error(`Request to ${url.toString()} failed after ${attempt} attempts: ${error.message}`);
      }
    }
  }

  // Helper method to determine if an error is retryable
  isRetryableError(error) {
    // Retry on network errors, timeouts, DNS issues, etc.
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENETUNREACH',
      'fetch failed'
    ];

    return retryableErrors.some(retryableError =>
      error.message.includes(retryableError) ||
      error.code === retryableError
    );
  }

  // Helper method for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method to create next-gen Stations API URLs (respects API key type)
  createNextGenApiUrl(endpoint) {
    if (this.isWorkspaceApiKey) {
      // Workspace API Key: /api/stations/v1/endpoint
      return `/api/stations/v1${endpoint}`;
    } else {
      // Account API Key: /api/stations/v1/w/{workspaceId}/endpoint
      if (!this.workspaceId) {
        throw new Error('Workspace ID is required for Account API keys. Please set TULIP_WORKSPACE_ID environment variable.');
      }
      return `/api/stations/v1/w/${this.workspaceId}${endpoint}`;
    }
  }

  // Helper method to create next-gen Users API URLs (never includes workspace ID)
  createNextGenUsersApiUrl(endpoint) {
    // Users API never uses workspace ID, regardless of API key type
    // Format: /api/users/v1/roles, /api/users/v1/users, etc.
    return `/api/users/v1${endpoint}`;
  }
}
