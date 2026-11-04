import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  AGGREGATION_MAX_LIMIT,
  NEWEST_FIRST,
  buildAggregationQuery,
  countTableRecords,
  listTableRecords,
  normalizeFilters,
  runTableAggregation,
} from '../src/server/tools/tableReads.js';
import { coffeeTable, fakeApiClient, httpError, invalidFieldType } from './helpers.js';

const OPEN = [{ field: 'status', functionType: 'equal', arg: 'OPEN' }];

describe('runTableAggregation request shape (bugs 1 and 2)', () => {
  test('filters and sortOptions are JSON-encoded', () => {
    const sortOptions = [{ sortBy: 'qty', sortDir: 'asc' }];
    const { query } = buildAggregationQuery({ function: 'sum', fieldId: 'qty', limit: 10, filters: OPEN, sortOptions, filterAggregator: 'all' });
    assert.equal(query.filters, JSON.stringify(OPEN));
    assert.equal(query.sortOptions, JSON.stringify(sortOptions));
    assert.equal(query.filterAggregator, 'all');
  });

  test('accepts filters and sortOptions already encoded as JSON strings', () => {
    const { query } = buildAggregationQuery({ function: 'count', fieldId: 'id', limit: 1, filters: JSON.stringify(OPEN) });
    assert.equal(query.filters, JSON.stringify(OPEN));
  });

  test('rejects a filters string that is not JSON instead of sending it', () => {
    assert.throws(() => buildAggregationQuery({ function: 'count', fieldId: 'id', limit: 1, filters: 'status=OPEN' }), /filters must be a JSON array/);
  });

  test('the URL that reaches the API carries the JSON, not "[object Object]"', async () => {
    const api = fakeApiClient(({ endpoint }) => (endpoint.endsWith('/count') ? 3 : { result: 3 }));
    await runTableAggregation(api, { tableId: 'T1', function: 'count', fieldId: 'id', limit: 10, filters: OPEN, sortOptions: NEWEST_FIRST });
    for (const { url } of api.calls) assert.ok(!/object(\+|%20)Object/.test(url), url);
    assert.equal(api.dataCalls[0].query.filters, JSON.stringify(OPEN));
    assert.equal(api.dataCalls[0].query.sortOptions, JSON.stringify(NEWEST_FIRST));
  });

  test('a single sort or filter object is treated as a one-item list', () => {
    const sort = { sortBy: 'qty', sortDir: 'asc' };
    const { query, sortProvided } = buildAggregationQuery({ function: 'max', fieldId: 'qty', sortOptions: sort, filters: JSON.stringify(OPEN[0]) });
    assert.equal(sortProvided, true);
    assert.equal(query.sortOptions, JSON.stringify([sort]));
    assert.equal(query.filters, JSON.stringify(OPEN));
  });

  test('limit defaults to the API maximum and is validated', () => {
    assert.equal(buildAggregationQuery({ function: 'count', fieldId: 'id' }).query.limit, AGGREGATION_MAX_LIMIT);
    assert.equal(buildAggregationQuery({ function: 'count', fieldId: 'id', limit: 0 }).query.limit, AGGREGATION_MAX_LIMIT);
    assert.equal(buildAggregationQuery({ function: 'count', fieldId: 'id', limit: '50' }).query.limit, 50);
    assert.throws(() => buildAggregationQuery({ function: 'count', fieldId: 'id', limit: 'lots' }), /limit must be/);
    assert.throws(() => buildAggregationQuery({ function: 'count', fieldId: 'id', limit: AGGREGATION_MAX_LIMIT + 1 }), /limit must be/);
  });
});

describe('runTableAggregation truncation (item 4)', () => {
  test('without sortOptions the newest records are kept', () => {
    const { query, sortProvided } = buildAggregationQuery({ function: 'max', fieldId: 'qty', limit: 100 });
    assert.equal(sortProvided, false);
    assert.equal(query.sortOptions, JSON.stringify(NEWEST_FIRST));
  });

  test('reports truncation when limit is below the matching record count', async () => {
    const api = fakeApiClient(({ endpoint }) => (endpoint.endsWith('/count') ? 1109 : { result: 42 }));
    const out = await runTableAggregation(api, { tableId: 'T1', function: 'max', fieldId: 'qty', limit: 100 });
    assert.equal(out.result, 42);
    assert.equal(out.truncated, true);
    assert.equal(out.matchingRecords, 1109);
    assert.equal(out.evaluatedRecords, 100);
    assert.match(out.notes[0], /Only the 100 newest of 1109/);
  });

  test('no truncation note when every record was evaluated', async () => {
    const api = fakeApiClient(({ endpoint }) => (endpoint.endsWith('/count') ? 50 : { result: 7 }));
    const out = await runTableAggregation(api, { tableId: 'T1', function: 'sum', fieldId: 'qty' });
    assert.equal(out.truncated, false);
    assert.equal(out.evaluatedRecords, 50);
    assert.deepEqual(out.notes, []);
  });

  test('with filters, the matching count comes from a filtered, uncapped /count', async () => {
    const api = fakeApiClient(({ endpoint }) => (endpoint.endsWith('/count') ? 250000 : { result: 1 }));
    const out = await runTableAggregation(api, { tableId: 'T1', function: 'max', fieldId: 'qty', limit: 100, filters: OPEN, filterAggregator: 'all' });
    const countCall = api.dataCalls[1];
    assert.equal(countCall.endpoint, '/tables/T1/count');
    assert.deepEqual(countCall.query, { filters: JSON.stringify(OPEN), filterAggregator: 'all' });
    assert.equal(out.matchingRecords, 250000);
    assert.equal(out.evaluatedRecords, 100);
    assert.equal(out.truncated, true);
  });

  test('a limit at the API maximum is still reported as truncated on larger tables', async () => {
    const api = fakeApiClient(({ endpoint }) => (endpoint.endsWith('/count') ? 250000 : { result: 1 }));
    const out = await runTableAggregation(api, { tableId: 'T1', function: 'sum', fieldId: 'qty', filters: OPEN });
    assert.equal(out.truncated, true);
    assert.match(out.notes[0], /100000 newest of 250000/);
  });
});

describe('countTableRecords', () => {
  test('forwards filters so filtered counts are exact', async () => {
    const api = fakeApiClient(() => 733);
    assert.equal(await countTableRecords(api, { tableId: 'T1', filters: OPEN, filterAggregator: 'any' }), 733);
    assert.deepEqual(api.dataCalls[0].query, { filters: JSON.stringify(OPEN), filterAggregator: 'any' });
  });

  test('unfiltered count sends no query string', async () => {
    const api = fakeApiClient(() => 5);
    await countTableRecords(api, { tableId: 'T1' });
    assert.equal(api.calls[0].url, 'https://example.tulip.co/api/v3/tables/T1/count');
  });
});

describe('runTableAggregation on timestamp fields (bug 3)', () => {
  function timestampApi(rows) {
    return fakeApiClient(({ endpoint, query }) => {
      if (endpoint === '/tables/T1') return coffeeTable;
      if (endpoint.endsWith('/records')) return rows(query);
      if (query.fieldId === 'started') throw invalidFieldType();
      return { result: 1108 };
    });
  }

  test('max reads the newest non-blank value from the records endpoint', async () => {
    const api = timestampApi(() => [{ started: '2026-10-07T17:01:20-04:00' }]);
    const out = await runTableAggregation(api, { tableId: 'T1', function: 'max', fieldId: 'started', filters: OPEN });
    assert.equal(out.result, '2026-10-07T17:01:20-04:00');
    const records = api.calls.find(c => c.endpoint.endsWith('/records'));
    assert.equal(records.query.limit, '1');
    assert.equal(records.query.sortOptions, JSON.stringify([{ sortBy: 'started', sortDir: 'desc' }]));
    assert.equal(records.query.filters, JSON.stringify([...OPEN, { field: 'started', functionType: 'notBlank' }]));
    assert.equal(records.query.fields, '["started"]');
    assert.match(out.notes[0], /does not support max on timestamp fields/);
  });

  test('min sorts ascending', async () => {
    const api = timestampApi(() => [{ started: '2025-09-30T12:08:51-04:00' }]);
    const out = await runTableAggregation(api, { tableId: 'T1', function: 'min', fieldId: 'started' });
    assert.equal(out.result, '2025-09-30T12:08:51-04:00');
    const records = api.calls.find(c => c.endpoint.endsWith('/records'));
    assert.equal(records.query.sortOptions, JSON.stringify([{ sortBy: 'started', sortDir: 'asc' }]));
  });

  test('count counts id where the timestamp is not blank', async () => {
    const api = timestampApi(() => []);
    const out = await runTableAggregation(api, { tableId: 'T1', function: 'count', fieldId: 'started', filters: OPEN, limit: 500 });
    assert.equal(out.result, 1108);
    const last = api.calls.at(-1);
    assert.equal(last.query.fieldId, 'id');
    assert.equal(last.query.limit, '500');
    assert.equal(last.query.filters, JSON.stringify([...OPEN, { field: 'started', functionType: 'notBlank' }]));
  });

  test('count with filterAggregator "any" explains why it cannot run', async () => {
    const api = timestampApi(() => []);
    await assert.rejects(
      runTableAggregation(api, { tableId: 'T1', function: 'count', fieldId: 'started', filters: OPEN, filterAggregator: 'any' }),
      /cannot be combined with filterAggregator "any"/,
    );
  });

  test('max with filterAggregator "any" skips blank values that sort first', async () => {
    const api = timestampApi(() => [{ started: null }, { started: null }, { started: '2026-01-01T00:00:00Z' }]);
    const out = await runTableAggregation(api, { tableId: 'T1', function: 'max', fieldId: 'started', filters: OPEN, filterAggregator: 'any' });
    assert.equal(out.result, '2026-01-01T00:00:00Z');
    const records = api.calls.find(c => c.endpoint.endsWith('/records'));
    assert.equal(records.query.filters, JSON.stringify(OPEN));
    assert.equal(records.query.filterAggregator, 'any');
  });

  test('InvalidFieldType on a non-timestamp field is passed through unchanged', async () => {
    const api = fakeApiClient(({ endpoint }) => {
      if (endpoint === '/tables/T1') return coffeeTable;
      throw invalidFieldType();
    });
    await assert.rejects(runTableAggregation(api, { tableId: 'T1', function: 'max', fieldId: 'photo' }), /InvalidFieldType/);
  });

  test('other API errors are not retried as timestamp fallbacks', async () => {
    const api = fakeApiClient(() => { throw httpError(404, { errorCode: 'NoSuchTulipTable' }); });
    await assert.rejects(runTableAggregation(api, { tableId: 'T1', function: 'max', fieldId: 'nope' }), /404/);
    assert.equal(api.calls.length, 1);
  });
});

describe('listTableRecords (item 5)', () => {
  test('forwards sort, filters, fields and offset in the shape the API parses', async () => {
    const api = fakeApiClient(() => []);
    await listTableRecords(api, {
      tableId: 'T1', limit: 5, offset: 20, sortOptions: NEWEST_FIRST, filters: OPEN, filterAggregator: 'any', fields: ['id', 'status'],
    });
    assert.deepEqual(api.dataCalls[0].query, {
      limit: '5',
      offset: '20',
      sortOptions: JSON.stringify(NEWEST_FIRST),
      filters: JSON.stringify(OPEN),
      filterAggregator: 'any',
      fields: '["id","status"]',
    });
  });

  test('a limit above 100 is paged in 100-record requests', async () => {
    const api = fakeApiClient(({ query }) => Array.from({ length: Number(query.limit) }, (_, i) => ({ id: String(Number(query.offset || 0) + i) })));
    const { records, notes } = await listTableRecords(api, { tableId: 'T1', limit: 250, offset: 10, sortOptions: NEWEST_FIRST });
    assert.equal(records.length, 250);
    assert.deepEqual(api.calls.map(c => [c.query.limit, c.query.offset]), [['100', '10'], ['100', '110'], ['50', '210']]);
    assert.equal(records[249].id, '259');
    assert.match(notes.at(-1), /Next page: offset=260/);
  });

  test('paging stops when the table runs out', async () => {
    const api = fakeApiClient(({ query }) => (query.offset === '100' ? [{ id: 'last' }] : Array.from({ length: 100 }, () => ({}))));
    const { records, notes } = await listTableRecords(api, { tableId: 'T1', limit: 500, sortOptions: NEWEST_FIRST });
    assert.equal(records.length, 101);
    assert.equal(api.calls.length, 2);
    assert.deepEqual(notes, []);
  });

  test('warns that the default order is not stable when paging without sortOptions', async () => {
    const api = fakeApiClient(() => []);
    const { notes } = await listTableRecords(api, { tableId: 'T1', limit: 200 });
    assert.match(notes[0], /No sortOptions/);
  });

  test('numeric strings and 0 are accepted for limit and offset, as before', async () => {
    const api = fakeApiClient(() => []);
    await listTableRecords(api, { tableId: 'T1', limit: '5', offset: '20' });
    await listTableRecords(api, { tableId: 'T1', limit: 0, offset: 0 });
    assert.deepEqual(api.calls.map(c => c.query), [{ limit: '5', offset: '20' }, {}]);
  });

  test('limit and offset are validated', async () => {
    const api = fakeApiClient(() => []);
    await assert.rejects(listTableRecords(api, { tableId: 'T1', limit: 1001 }), /limit must be/);
    await assert.rejects(listTableRecords(api, { tableId: 'T1', offset: -1 }), /offset must be/);
    assert.equal(api.calls.length, 0);
  });

  test('includeTotalCount reports the filtered total', async () => {
    const api = fakeApiClient(({ endpoint }) => (endpoint.endsWith('/count') ? 733 : [{ id: '1' }]));
    const { notes } = await listTableRecords(api, { tableId: 'T1', limit: 1, filters: OPEN, includeTotalCount: true });
    assert.match(notes.at(-1), /733 records match/);
    assert.equal(api.calls[1].query.filters, JSON.stringify(OPEN));
  });
});

describe('filter args are typed from the table columns', () => {
  const filtersSent = async args => {
    const api = fakeApiClient(({ endpoint }) => (endpoint === '/tables/T1' ? coffeeTable : 0));
    await countTableRecords(api, { tableId: 'T1', filters: args });
    return JSON.parse(api.dataCalls[0].query.filters).map(f => f.arg);
  };

  test('numeric and boolean text becomes a number or boolean; text and timestamps stay text', async () => {
    assert.deepEqual(await filtersSent([
      { field: 'qty', functionType: 'equal', arg: '1' },
      { field: 'wait', functionType: 'greaterThan', arg: ' 10 ' },
      { field: 'price', functionType: 'lessThan', arg: '1.5' },
      { field: '_sequenceNumber', functionType: 'equal', arg: '3' },
      { field: 'paid', functionType: 'equal', arg: 'TRUE' },
      { field: 'status', functionType: 'equal', arg: '1' },
      { field: 'started', functionType: 'greaterThan', arg: '2026-01-01T00:00:00Z' },
      { field: 'qty', functionType: 'equal', arg: 'abc' },
    ]), [1, 10, 1.5, 3, true, '1', '2026-01-01T00:00:00Z', 'abc']);
  });

  test('isIn and notIsIn take a comma list, a JSON array string, an array or a single value', async () => {
    assert.deepEqual(await filtersSent([
      { field: 'status', functionType: 'isIn', arg: 'OPEN, DONE' },
      { field: 'status', functionType: 'isIn', arg: '["a,b","c"]' },
      { field: 'qty', functionType: 'isIn', arg: '1,2' },
      { field: 'qty', functionType: 'notIsIn', arg: ['3', 4] },
      { field: 'qty', functionType: 'notIsIn', arg: 5 },
    ]), [['OPEN', 'DONE'], ['a,b', 'c'], [1, 2], [3, 4], [5]]);
  });

  test('the table is not fetched when every arg is already typed', async () => {
    const api = fakeApiClient(() => 0);
    await countTableRecords(api, { tableId: 'T1', filters: [{ field: 'qty', functionType: 'equal', arg: 1 }, { field: 'status', functionType: 'notBlank' }] });
    assert.deepEqual(api.calls.map(c => c.endpoint), ['/tables/T1/count']);
  });

  test('if the table lookup fails, lists are still split and other args are sent as given', async () => {
    const args = await normalizeFilters({ filters: [{ field: 'qty', functionType: 'equal', arg: '1' }, { field: 'status', functionType: 'isIn', arg: 'A,B' }] },
      async () => new Map());
    assert.deepEqual(args.filters.map(f => f.arg), ['1', ['A', 'B']]);
  });

  test('listTableRecords and runTableAggregation send typed args too', async () => {
    const respond = ({ endpoint }) => (endpoint === '/tables/T1' ? coffeeTable : endpoint.endsWith('/count') ? 1 : endpoint.endsWith('/records') ? [] : { result: 1 });
    const filters = [{ field: 'qty', functionType: 'isIn', arg: '1,2' }];
    for (const call of [
      api => listTableRecords(api, { tableId: 'T1', filters }),
      api => runTableAggregation(api, { tableId: 'T1', function: 'sum', fieldId: 'qty', filters }),
    ]) {
      const api = fakeApiClient(respond);
      await call(api);
      for (const c of api.dataCalls) assert.equal(c.query.filters, JSON.stringify([{ field: 'qty', functionType: 'isIn', arg: [1, 2] }]));
      assert.equal(api.calls.filter(c => c.endpoint === '/tables/T1').length, 1);
    }
  });
});

describe('interval aggregations are reported in seconds', () => {
  const aggregate = (fn, result, fieldId = 'wait') => {
    const api = fakeApiClient(({ endpoint }) => (endpoint === '/tables/T1' ? coffeeTable : endpoint.endsWith('/count') ? 2 : { result }));
    return runTableAggregation(api, { tableId: 'T1', function: fn, fieldId });
  };

  test('value functions on an interval field are divided by 1000, with a note', async () => {
    const out = await aggregate('max', 15000);
    assert.equal(out.result, 15);
    assert.match(out.notes[0], /milliseconds/);
    assert.deepEqual((await aggregate('uniqueValues', [15000, 7000])).result, [15, 7]);
    assert.equal((await aggregate('avg', 11000)).result, 11);
  });

  test('count on an interval field and values on other numeric fields are unchanged', async () => {
    assert.equal((await aggregate('count', 2)).result, 2);
    const out = await aggregate('max', 15000, 'qty');
    assert.equal(out.result, 15000);
    assert.deepEqual(out.notes, []);
  });
});

describe('uniqueValues cap', () => {
  const unique = n => {
    const api = fakeApiClient(({ endpoint }) => (endpoint === '/tables/T1' ? coffeeTable : endpoint.endsWith('/count') ? 5000 : { result: Array.from({ length: n }, (_, i) => `v${i}`) }));
    return runTableAggregation(api, { tableId: 'T1', function: 'uniqueValues', fieldId: 'status' });
  };

  test('a full 1000-value result says more values may exist', async () => {
    assert.match((await unique(1000)).notes.join(' '), /at most 1000 unique values/);
  });

  test('fewer than 1000 values adds no cap note', async () => {
    assert.ok(!(await unique(999)).notes.join(' ').includes('unique values'));
  });
});
