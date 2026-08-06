---
name: manage-tables
description: "Create, query, and manage Tulip Tables and their records. Use when the user wants to create tables, add/update/delete records, run aggregations, set up table queries, or link tables together."
---

# Manage Tulip Tables

## Keywords
create table, table records, add record, update record, delete record, table query, aggregation, link tables, list tables, table columns, count records, table schema, filter records

## Overview

Tulip Tables are the data layer of the platform. Tables store records (rows) with
typed columns. They can be queried with saved filters, aggregated for summary
statistics, and linked to create relationships between datasets.

**Use this skill when:** The user wants to work with data — creating tables, managing
records, running queries or aggregations, or setting up table links.

---

## Workflow

### Step 1: Find or create a table

**List all tables:**
```
listTables()
```
Returns all tables with their IDs, names, and column definitions.

**Get full table details (including column types and IDs):**
```
getTable(tableId="<tableId>")
```
Column IDs from this response are needed when creating records or running aggregations.

**Create a new table:**
```
createTable(tableData={ name: "My Table", columns: [...] })
```

**Update a table (rename or add/modify columns):**
```
updateTable(tableId="<tableId>", tableData={ ... })
```

---

### Step 2: Work with records

**List records (paginated):**
```
listTableRecords(tableId="<tableId>", limit=50, offset=0)
```

**Get a single record:**
```
getTableRecord(tableId="<tableId>", recordId="<recordId>")
```

**Count records (without fetching them):**
```
countTableRecords(tableId="<tableId>")
```

**Create a record:**
```
createTableRecord(tableId="<tableId>", recordData={ fieldId: "value", ... })
```
Use column IDs (not column names) as keys in `recordData`. Get column IDs from `getTable`.

**Update a record:**
```
updateTableRecord(tableId="<tableId>", recordId="<recordId>", recordData={ fieldId: "new value" })
```

**Increment a numeric field atomically (useful for counters):**
```
incrementTableRecordField(tableId="<tableId>", recordId="<recordId>", fieldName="<fieldId>", value=1)
```
Pass a negative value to decrement.

**Delete a record:**
```
deleteTableRecord(tableId="<tableId>", recordId="<recordId>")
```

**Delete ALL records in a table [DANGEROUS]:**
```
deleteAllTableRecords(tableId="<tableId>")
```
This wipes all data permanently. Confirm with the user before calling.

---

### Step 3: Query and aggregate

**Saved table queries** are reusable filters that can be applied in Tulip apps:

```
listTableQueries(tableId="<tableId>")
getTableQuery(tableId="<tableId>", queryId="<queryId>")
createTableQuery(tableId="<tableId>", label="...", filters=[...], filterAggregator="all", sortOptions=[...], limit=100)
updateTableQuery(tableId="<tableId>", queryId="<queryId>", label="...", filters=[...], filterAggregator="all", sortOptions=[...], limit=100)
deleteTableQuery(tableId="<tableId>", queryId="<queryId>")
```

Filter object shape:
```json
{ "field": "<columnId>", "functionType": "equal", "arg": "value" }
```
Supported `functionType` values: `equal`, `notEqual`, `greaterThan`, `lessThan`,
`greaterThanOrEqual`, `lessThanOrEqual`, `contains`, `notContains`, `isEmpty`, `isNotEmpty`.

**Aggregations** compute summary statistics over table data:

```
listTableAggregations(tableId="<tableId>")
getTableAggregation(tableId="<tableId>", aggregationId="<aggregationId>")
createTableAggregation(tableId="<tableId>", field="<columnId>", fn="sum", label="Total Count")
updateTableAggregation(tableId="<tableId>", aggregationId="<aggregationId>", field="...", fn="...", label="...")
deleteTableAggregation(tableId="<tableId>", aggregationId="<aggregationId>")
```

**Run an ad-hoc aggregation** (does not need to be saved first):
```
runTableAggregation(tableId="<tableId>", function="sum", fieldId="<columnId>", limit=10000, filters=[...], sortOptions=[...])
```
Valid functions: `sum`, `count`, `avg`, `min`, `max`, `mode`, `uniqueValues`.

---

### Step 4: Link tables

Table links create relationships between two tables (like foreign keys).

**Create a link definition:**
```
createTableLink(linkData={ ... })
```

**Get link details:**
```
getTableLink(tableLinkId="<tableLinkId>")
```

**Update link column labels:**
```
updateTableLinkLabels(tableLinkId="<tableLinkId>", leftColumnLabel="...", rightColumnLabel="...")
```

**Link two records together:**
```
linkTableRecords(tableLinkId="<tableLinkId>", leftRecord="<recordId>", rightRecord="<recordId>")
```

**Unlink two records:**
```
unlinkTableRecords(tableLinkId="<tableLinkId>", leftRecord="<recordId>", rightRecord="<recordId>")
```

---

## Tips

- Always call `getTable` before creating records to get correct column IDs.
- `deleteAllTableRecords` is permanent — always confirm intent with the user first.
- `runTableAggregation` is ad-hoc; `createTableAggregation` saves one for use in apps.
- Aggregation functions like `uniqueValues` return all distinct values — useful for
  understanding what's in a column without paging through records.

---

## Tools used by this skill

| Tool | Purpose |
|---|---|
| `listTables` | List all tables |
| `getTable` | Get table schema and column IDs |
| `createTable` | Create a new table |
| `updateTable` | Update table structure |
| `listTableRecords` | List records with pagination |
| `getTableRecord` | Get a single record |
| `createTableRecord` | Add a record |
| `updateTableRecord` | Update a record |
| `deleteTableRecord` | Delete a record |
| `deleteAllTableRecords` | Delete all records (dangerous) |
| `incrementTableRecordField` | Atomically increment a numeric field |
| `countTableRecords` | Count records |
| `createTableQuery` | Create a saved query |
| `listTableQueries` | List saved queries |
| `getTableQuery` | Get a saved query |
| `updateTableQuery` | Update a saved query |
| `deleteTableQuery` | Delete a saved query |
| `createTableAggregation` | Create a saved aggregation |
| `listTableAggregations` | List saved aggregations |
| `getTableAggregation` | Get a saved aggregation |
| `updateTableAggregation` | Update a saved aggregation |
| `deleteTableAggregation` | Delete a saved aggregation |
| `runTableAggregation` | Run an ad-hoc aggregation |
| `createTableLink` | Create a table link relationship |
| `getTableLink` | Get link details |
| `updateTableLinkLabels` | Update link column labels |
| `linkTableRecords` | Link two records |
| `unlinkTableRecords` | Unlink two records |
