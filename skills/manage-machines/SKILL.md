---
name: manage-machines
description: "View machine types, report machine attribute values, and retrieve machine activity archives. Use when the user wants to explore what machines are defined, write attribute data to a machine, or export machine activity data."
---

# Manage Tulip Machines

## Keywords
machine, machine type, machine attribute, report attribute, IIoT, machine monitoring, activity archive, machine data, OEE, attribute value, machine status

## Overview

Tulip's Machines API connects to physical equipment on the shop floor. Machine types
define the structure (which attributes are tracked); machines are individual instances
of those types. Attributes are the data points reported from equipment — things like
speed, temperature, cycle count, or status.

**Use this skill when:** The user wants to see what machines are defined, write
attribute values (e.g. from an external system), or export machine activity data.

---

## Workflow

### View machine types and machines

```
listMachineTypes()
```

Returns all machine types and the machines under each type. Each machine type defines
a set of attributes; each machine instance tracks actual values for those attributes.

---

### Report attribute values

Use this to write data into Tulip from an external source — for example, pushing a
cycle count or machine status from an external system.

```
reportAttributes(attributes={
  "<machineId>/<attributeId>": <value>,
  "<machineId>/<attributeId>": <value>
})
```

The `attributes` object maps `machineId/attributeId` keys to the values to report.
Get machine IDs from `listMachineTypes()`. Attribute IDs must be known in advance —
they are configured inside the Tulip instance.

Example:
```json
{
  "machine-001/attr-cycle-count": 142,
  "machine-001/attr-status": "running"
}
```

---

### Export machine activity data

Machine activity archives contain historical records of machine state changes — useful
for OEE analysis, downtime tracking, or feeding data into external systems.

**Step 1 — Start the archive job:**
```
generateMachineActivityArchive(machineId="<machineId>")
```
Returns a `jobId`. This kicks off an async export job on the server.

**Step 2 — Poll for the result:**
```
retrieveMachineActivityArchive(jobId="<jobId>")
```
Poll this until the archive is ready. The response will include a download URL or
status indicator. Wait a few seconds between polls — this is a server-side job.

---

## Tips

- `listMachineTypes()` is the read tool for discovering machines and their types.
  Use it to find machine IDs before reporting attributes.
- `reportAttributes` is write-only — it does not return current attribute values.
- Archive generation creates server load — use sparingly and not in tight loops.

---

## Tools used by this skill

| Tool | Purpose |
|---|---|
| `listMachineTypes` | List all machine types and their machines |
| `reportAttributes` | Write attribute values to a machine |
| `generateMachineActivityArchive` | Start an async machine activity export |
| `retrieveMachineActivityArchive` | Poll for archive job status and download URL |
