/**
 * Read helpers for Tulip Tables: runTableAggregation and listTableRecords.
 *
 * These live outside ToolHandlers so the request shapes can be unit tested
 * without a network. Every rule here was checked against the live v3 Tables
 * API and the server source (models/endpoints/ddms/records):
 *
 * - `filters`, `sortOptions` and `fields` are parsed by the server as a JSON
 *   value in a single query parameter. Any other encoding (repeated keys,
 *   comma lists, "[object Object]") is a 400 InvalidQueryString.
 * - runAggregation only accepts numeric, text and boolean fields for every
 *   function except uniqueValues (isValidFieldType). Timestamp fields get a
 *   422 InvalidFieldType for min/max/count, so those are computed here from
 *   the records endpoint instead.
 * - Without sortOptions, runAggregation's `limit` keeps the oldest records.
 * - GET /records returns 10 rows by default and at most 100 per request.
 */

export const AGGREGATION_MAX_LIMIT = 100000;
export const RECORDS_PAGE_MAX = 100;
export const LIST_RECORDS_MAX = 1000;
export const NEWEST_FIRST = [{ sortBy: '_createdAt', sortDir: 'desc' }];

// Column types the records endpoint can sort, used for min/max fallbacks
const TIMESTAMP_TYPES = new Set(['timestamp', 'datetime']);
const TIMESTAMP_FALLBACK_FUNCTIONS = new Set(['min', 'max', 'count']);
// How far the max fallback scans past blank values when it cannot filter them out
const MAX_FALLBACK_SCAN_PAGES = 10;

/**
 * Encode a filters/sortOptions/fields argument as the single JSON query value
 * the Tables API expects. Accepts an array, a single object, or either one
 * already encoded as a JSON string.
 */
export function toJsonParam(value, name) {
  const list = parseList(value, name);
  return list.length ? JSON.stringify(list) : undefined;
}

function parseList(value, name = 'value') {
  if (value === undefined || value === null || value === '') return [];
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${name} must be a JSON array (got ${JSON.stringify(value)})`);
    }
  }
  return Array.isArray(parsed) ? parsed : [parsed];
}

/**
 * MCP clients sometimes send numbers as strings; 0 or blank means "not set",
 * as it did before these arguments were validated.
 */
function toOptionalInt(value) {
  if (value === undefined || value === null || value === '' || value === 0 || value === '0') return undefined;
  const number = typeof value === 'string' ? Number(value.trim()) : value;
  return Number.isNaN(number) ? value : number;
}

function isAnyAggregator(args) {
  return typeof args.filterAggregator === 'string' && args.filterAggregator.toLowerCase() === 'any';
}

function validateLimit(limit, max, name = 'limit') {
  if (!Number.isInteger(limit) || limit < 1 || limit > max) {
    throw new Error(`${name} must be an integer between 1 and ${max} (got ${JSON.stringify(limit)})`);
  }
}

/**
 * Build the runAggregation query string. When no sortOptions are given the
 * newest records are kept, so a `limit` below the table size reflects the
 * current state rather than the oldest rows.
 */
export function buildAggregationQuery(args) {
  const limit = toOptionalInt(args.limit) ?? AGGREGATION_MAX_LIMIT;
  validateLimit(limit, AGGREGATION_MAX_LIMIT);

  const sortProvided = parseList(args.sortOptions).length > 0;
  const query = {
    function: args['function'],
    fieldId: args.fieldId,
    limit,
    sortOptions: sortProvided ? toJsonParam(args.sortOptions, 'sortOptions') : JSON.stringify(NEWEST_FIRST),
  };
  const filters = toJsonParam(args.filters, 'filters');
  if (filters) query.filters = filters;
  if (args.filterAggregator) query.filterAggregator = args.filterAggregator;

  return { query, sortProvided };
}

/**
 * Build one GET /records query string.
 */
export function buildRecordsQuery(args, { limit, offset } = {}) {
  const query = {};
  if (limit !== undefined) query.limit = limit;
  if (offset) query.offset = offset;
  const sortOptions = toJsonParam(args.sortOptions, 'sortOptions');
  if (sortOptions) query.sortOptions = sortOptions;
  const filters = toJsonParam(args.filters, 'filters');
  if (filters) query.filters = filters;
  if (args.filterAggregator) query.filterAggregator = args.filterAggregator;
  const fields = toJsonParam(args.fields, 'fields');
  if (fields) query.fields = fields;
  return query;
}

/**
 * Count the records that match the given filters. GET /count takes the same
 * filters as /records and, unlike a runAggregation count, is not capped.
 */
export async function countTableRecords(apiClient, args) {
  const query = {};
  const filters = toJsonParam(args.filters, 'filters');
  if (filters) query.filters = filters;
  if (args.filterAggregator) query.filterAggregator = args.filterAggregator;
  return Number(await apiClient.makeRequest(`/tables/${args.tableId}/count`, 'GET', null, query));
}

function isInvalidFieldTypeError(error) {
  return /HTTP 422/.test(error.message) && /InvalidFieldType/.test(error.message);
}

/**
 * min/max/count on a timestamp field, which runAggregation rejects.
 * min/max come from the records endpoint sorted on the field; count is a
 * count of `id` over records where the field is not blank (same semantics
 * as count on any other field).
 */
async function runTimestampAggregation(apiClient, args, query) {
  const fn = args['function'];
  const userFilters = parseList(args.filters);
  const anyAggregator = isAnyAggregator(args) && userFilters.length > 0;
  const notBlank = { field: args.fieldId, functionType: 'notBlank' };

  if (fn === 'count') {
    if (anyAggregator) {
      throw new Error(`count on timestamp field "${args.fieldId}" cannot be combined with filterAggregator "any": the API rejects count on timestamp fields, and the workaround needs to AND a notBlank filter. Use filterAggregator "all", or count "id" instead.`);
    }
    const countQuery = { ...query, fieldId: 'id', filters: JSON.stringify([...userFilters, notBlank]) };
    const { result } = await apiClient.makeRequest(`/tables/${args.tableId}/runAggregation`, 'GET', null, countQuery);
    return {
      result,
      notes: [`The Tables API does not support count on timestamp fields, so this counted records where "${args.fieldId}" is not blank.`],
    };
  }

  const sortDir = fn === 'min' ? 'asc' : 'desc';
  const recordArgs = {
    sortOptions: [{ sortBy: args.fieldId, sortDir }],
    filters: anyAggregator ? userFilters : [...userFilters, notBlank],
    filterAggregator: args.filterAggregator,
    fields: [args.fieldId],
  };

  // With "any" we cannot AND notBlank, and descending sorts put blanks first,
  // so scan forward to the first non-blank value.
  const pageSize = anyAggregator ? RECORDS_PAGE_MAX : 1;
  const maxPages = anyAggregator ? MAX_FALLBACK_SCAN_PAGES : 1;
  let value = null;
  for (let page = 0; page < maxPages && value === null; page++) {
    const rows = await apiClient.makeRequest(`/tables/${args.tableId}/records`, 'GET', null,
      buildRecordsQuery(recordArgs, { limit: pageSize, offset: page * pageSize }));
    const hit = rows.find(row => row[args.fieldId] !== null && row[args.fieldId] !== undefined);
    if (hit) value = hit[args.fieldId];
    if (rows.length < pageSize) break;
  }

  const notes = [`The Tables API does not support ${fn} on timestamp fields, so this was read from the records endpoint sorted by "${args.fieldId}" ${sortDir}. It covers every record matching the filters; limit and sortOptions do not apply.`];
  if (value === null && anyAggregator) {
    notes.push(`No non-blank value found in the first ${MAX_FALLBACK_SCAN_PAGES * RECORDS_PAGE_MAX} matching records.`);
  }
  return { result: value, notes };
}

/**
 * runTableAggregation with correct serialization, timestamp support and an
 * explicit truncation report.
 */
export async function runTableAggregation(apiClient, args) {
  const { query, sortProvided } = buildAggregationQuery(args);

  let response;
  try {
    const { result } = await apiClient.makeRequest(`/tables/${args.tableId}/runAggregation`, 'GET', null, query);
    response = { result, notes: [] };
  } catch (error) {
    if (!isInvalidFieldTypeError(error) || !TIMESTAMP_FALLBACK_FUNCTIONS.has(args['function'])) throw error;
    const table = await apiClient.makeRequest(`/tables/${args.tableId}`);
    const column = (table.columns || []).find(c => c.name === args.fieldId);
    const type = column?.dataType?.type;
    if (!TIMESTAMP_TYPES.has(type)) throw error;
    return runTimestampAggregation(apiClient, args, query);
  }

  const count = await countTableRecords(apiClient, args);
  const truncated = query.limit < count;
  const meta = {
    matchingRecords: count,
    evaluatedRecords: Math.min(query.limit, count),
    truncated,
    sortOptions: JSON.parse(query.sortOptions),
  };
  if (truncated) {
    response.notes.push(sortProvided
      ? `Only ${query.limit} of ${meta.matchingRecords} matching records were aggregated, chosen by the given sortOptions.`
      : `Only the ${query.limit} newest of ${meta.matchingRecords} matching records (by _createdAt) were aggregated. Raise limit (max ${AGGREGATION_MAX_LIMIT}) to include all of them.`);
  }
  return { result: response.result, ...meta, notes: response.notes };
}

/**
 * listTableRecords with sort, filter and field selection. A limit above the
 * API's 100-row page is served by paging with offset, up to LIST_RECORDS_MAX.
 */
export async function listTableRecords(apiClient, rawArgs) {
  const args = { ...rawArgs, limit: toOptionalInt(rawArgs.limit) };
  const offset = toOptionalInt(rawArgs.offset) ?? 0;
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`offset must be a non-negative integer (got ${JSON.stringify(rawArgs.offset)})`);
  }
  if (args.limit !== undefined) validateLimit(args.limit, LIST_RECORDS_MAX);
  const notes = [];

  let records;
  if (args.limit === undefined || args.limit <= RECORDS_PAGE_MAX) {
    records = await apiClient.makeRequest(`/tables/${args.tableId}/records`, 'GET', null,
      buildRecordsQuery(args, { limit: args.limit, offset }));
  } else {
    if (parseList(args.sortOptions).length === 0) {
      notes.push('No sortOptions were given, so pages were read in the API default order. Pass sortOptions for a stable order across pages.');
    }
    records = [];
    while (records.length < args.limit) {
      const pageLimit = Math.min(RECORDS_PAGE_MAX, args.limit - records.length);
      const page = await apiClient.makeRequest(`/tables/${args.tableId}/records`, 'GET', null,
        buildRecordsQuery(args, { limit: pageLimit, offset: offset + records.length }));
      records.push(...page);
      if (page.length < pageLimit) break;
    }
  }

  const requested = args.limit ?? 10;
  if (records.length === requested) {
    notes.push(`Returned ${records.length} records; more may exist. Next page: offset=${offset + records.length}.`);
  }
  if (args.includeTotalCount) {
    notes.push(`${await countTableRecords(apiClient, args)} records match in total.`);
  }
  return { records, notes };
}
