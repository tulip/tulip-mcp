---
name: manage-stations
description: "Create, configure, and manage Tulip Stations and Station Groups. Use when the user wants to set up stations, assign apps to stations, organize stations into groups, or manage player interfaces."
---

# Manage Tulip Stations

## Keywords
create station, station group, assign app, player interface, shop floor, station assignment, station config, interface, kiosk, workstation, production line

## Overview

Stations represent physical or virtual workstations where operators run Tulip apps.
Stations can be organized into station groups and have apps assigned to them.
Interfaces define how the Tulip Player displays apps on station devices.

**Use this skill when:** The user wants to set up or reconfigure their shop floor —
creating stations, assigning apps, organizing station groups, or managing interfaces.

---

## Workflow

### Step 1: View the current setup

```
listStations()                               # All stations
listStationGroups()                          # How they're organized
listInterfaces()                             # Existing player interfaces
```

---

### Step 2: Create or update stations

**Create a station:**
```
createStation(stationData={ name: "Line 1 - Station A" })
```

**Update a station:**
```
updateStation(stationId="<id>", stationData={ name: "New Name" })
```

**Get station details:**
```
getStation(stationId="<id>")
```

**Archive a station (permanent — removes from active use):**
```
archiveStation(stationId="<id>")
```
Confirm with the user before archiving.

---

### Step 3: Organize into station groups

Station groups let you push app assignments to many stations at once.

**Create a group:**
```
createStationGroup(stationGroupData={ name: "Assembly Line 1" })
```

**Add stations to a group:**
```
updateStationGroupStations(stationGroupId="<id>", stationIds=["<id1>", "<id2>"])
```

**Update group settings:**
```
updateStationGroup(stationGroupId="<id>", stationGroupData={ name: "New Name" })
```

**Get group details:**
```
getStationGroup(stationGroupId="<id>")
```

**Archive a station group:**
```
archiveStationGroup(stationGroupId="<id>")
```

---

### Step 4: Assign apps to stations

App assignments control which apps appear in the Tulip Player on a station.

**Assign an app to a single station:**
```
createStationAppAssignment(stationId="<id>", appAssignmentData={ appId: "<appId>", tag: "prod" })
```

**List assignments on a station:**
```
listStationAppAssignments(stationId="<id>")
```

**Update an existing assignment:**
```
manageStationAppAssignment(stationId="<id>", appAssignmentId="<id>", type="...", tag="prod")
```

**Remove a single assignment:**
```
deleteStationAppAssignment(stationId="<id>", appAssignmentId="<id>")
```

**Remove all assignments from a station:**
```
removeAllStationAppAssignments(stationId="<id>")
```
Confirm with the user before removing all.

**Assign an app to a station group (applies to all stations in the group):**
```
createStationGroupAppAssignment(stationGroupId="<id>", appAssignmentData={ appId: "<appId>", tag: "prod" })
```

**List group assignments:**
```
listStationGroupAppAssignments(stationGroupId="<id>")
```

**Update a group assignment:**
```
manageStationGroupAppAssignment(stationGroupId="<id>", appAssignmentId="<id>", type="...", tag="prod")
```

**Remove a group assignment:**
```
deleteStationGroupAppAssignment(stationGroupId="<id>", appAssignmentId="<id>")
```

**Remove all group assignments:**
```
removeAllStationGroupAppAssignments(stationGroupId="<id>")
```

---

### Step 5: Manage interfaces

Interfaces define the player display configuration tied to a station device.

**List all interfaces:**
```
listInterfaces()
```

**Get interface details:**
```
getInterface(interfaceId="<id>")
```

**Create an interface (automatically assigns to a station):**
```
createInterface(name="Line 1 Interface", stationId="<id>", replaceInterfaceAtStation=false)
```

**Update interface settings:**
```
updateInterface(interfaceId="<id>", interfaceData={ name: "New Name" })
```

**Reassign an interface to a different station:**
```
updateInterfaceStationAssignment(interfaceId="<id>", stationId="<newStationId>", replaceInterfaceAtStation=false)
```

**Unassign an interface from its station:**
```
deleteInterfaceStationAssignment(interfaceId="<id>")
```

**Archive an interface:**
```
archiveInterface(interfaceId="<id>")
```

---

## App assignment tags

The `tag` field on an app assignment controls which version of the app runs:
- `"prod"` — the latest published production version
- `"dev"` — the in-development version (use for testing)

---

## Tools used by this skill

| Tool | Purpose |
|---|---|
| `listStations` | List all stations |
| `getStation` | Get station details |
| `createStation` | Create a new station |
| `updateStation` | Update station config |
| `archiveStation` | Archive a station |
| `listStationGroups` | List station groups |
| `getStationGroup` | Get group details |
| `createStationGroup` | Create a station group |
| `updateStationGroup` | Update group config |
| `updateStationGroupStations` | Set which stations are in a group |
| `archiveStationGroup` | Archive a station group |
| `createStationAppAssignment` | Assign an app to a station |
| `listStationAppAssignments` | List app assignments on a station |
| `manageStationAppAssignment` | Update a station app assignment |
| `deleteStationAppAssignment` | Remove a station app assignment |
| `removeAllStationAppAssignments` | Remove all assignments from a station |
| `createStationGroupAppAssignment` | Assign an app to a station group |
| `listStationGroupAppAssignments` | List app assignments on a group |
| `manageStationGroupAppAssignment` | Update a group app assignment |
| `deleteStationGroupAppAssignment` | Remove a group app assignment |
| `removeAllStationGroupAppAssignments` | Remove all assignments from a group |
| `listInterfaces` | List interfaces |
| `getInterface` | Get interface details |
| `createInterface` | Create an interface |
| `updateInterface` | Update interface config |
| `updateInterfaceStationAssignment` | Reassign interface to a station |
| `deleteInterfaceStationAssignment` | Unassign interface from its station |
| `archiveInterface` | Archive an interface |
