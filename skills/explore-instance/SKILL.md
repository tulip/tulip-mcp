---
name: explore-instance
description: "Explore and audit a Tulip instance: list tables, users, stations, machines, and app groups. Use when the user wants to understand what's deployed, who has access, how the instance is configured, or needs an overview of the environment."
---

# Explore a Tulip instance

## Keywords
list tables, list users, list stations, list machines, list apps, audit, instance overview, who has access, what's deployed, environment, shop floor, overview

## Overview

This skill helps you survey a Tulip instance — what data tables exist, how stations
are configured, who the users are, and what machine types are defined. It's useful for
audits, onboarding to a new instance, or answering broad "what do we have?" questions.

**Use this skill when:** The user wants to understand the current state of their Tulip
instance, audit configurations, or explore what's deployed.

---

## Workflow

### Tables and data

```
listTables()                                 # All tables with names and column info
getTable(tableId="<id>")                     # Full table schema including column types
countTableRecords(tableId="<id>")            # How many records are in a table
listTableAggregations(tableId="<id>")        # Saved aggregations on a table
listTableQueries(tableId="<id>")             # Saved queries on a table
```

### Stations and shop floor

```
listStations()                               # All stations
getStation(stationId="<id>")                 # Station details
listStationGroups()                          # How stations are organized
getStationGroup(stationGroupId="<id>")       # Group details
listStationAppAssignments(stationId="<id>")  # What apps are assigned to a station
listStationGroupAppAssignments(stationGroupId="<id>")  # App assignments for a group
listInterfaces()                             # Player interfaces
getInterface(interfaceId="<id>")             # Interface details
```

### Apps

```
listAppGroups()                              # App groups and their containing apps
```

### Users and access

```
listUsers()                                  # All users in the instance
getUser(userId="<id>")                       # User details including role
listUserRoles()                              # All available roles
getUserRole(userRoleId="<id>")               # Role details
listUserGroups()                             # All user groups
getUserGroup(userGroupId="<id>")             # Group details
getUserGroupUsers(userGroupId="<id>")        # Members of a user group
```

### Machines and IIoT

```
listMachineTypes()                           # All machine types and their machines
```

---

## Common audit patterns

### "What data do we have?"
1. `listTables()` — get all tables with names
2. `getTable(tableId)` on key ones to see column definitions
3. `countTableRecords(tableId)` to understand data volume

### "How is the shop floor set up?"
1. `listStations()` — all stations
2. `listStationGroups()` — how they're organized
3. `listStationAppAssignments(stationId)` on each station — what apps run where
4. `listInterfaces()` — what player interfaces exist

### "Who has access?"
1. `listUsers()` — all users
2. `listUserRoles()` — find role IDs
3. `listUserGroups()` — groups and membership
4. `getUserGroupUsers(userGroupId)` — who's in each group

### "What machines are connected?"
1. `listMachineTypes()` — returns machine types and all machines under each type

---

## Tools used by this skill

All read-only tools. This skill is purely exploratory — no writes, no deletes.

| Area | Tools |
|---|---|
| Tables | `listTables`, `getTable`, `countTableRecords`, `listTableAggregations`, `listTableQueries`, `getTableLink` |
| Stations | `listStations`, `getStation`, `listStationGroups`, `getStationGroup`, `listStationAppAssignments`, `listStationGroupAppAssignments` |
| Interfaces | `listInterfaces`, `getInterface` |
| Apps | `listAppGroups` |
| Users | `listUsers`, `getUser`, `listUserRoles`, `getUserRole`, `listUserGroups`, `getUserGroup`, `getUserGroupUsers`, `listUserUserGroups` |
| Machines | `listMachineTypes` |
