---
name: manage-users
description: "View and manage Tulip users, user groups, and roles. Use when the user wants to list users, check group membership, review roles, or create a new user account."
---

# Manage Tulip Users

## Keywords
list users, user groups, user roles, create user, badge id, group membership, role, access control, who has access, operator, user management

## Overview

Tulip's user model has three layers: users (individual accounts), user groups
(collections of users for access control), and roles (permission sets). This skill
covers reading and managing all three using the public API.

**Use this skill when:** The user wants to see who's in the system, check group
membership, review roles, or add a new user.

---

## Workflow

### View users

**List all users:**
```
listUsers()
```

**Get a specific user:**
```
getUser(userId="<userId>")
```
Returns the user's name, badge ID, role, and metadata.

---

### Manage user groups

User groups control access to apps and stations. A user can belong to multiple groups.

**List all groups:**
```
listUserGroups()
```

**Get group details:**
```
getUserGroup(userGroupId="<userGroupId>")
```

**List members of a group:**
```
getUserGroupUsers(userGroupId="<userGroupId>")
```

**List all groups a user belongs to:**
```
listUserUserGroups(userId="<userId>")
```

---

### Review roles

**List all roles:**
```
listUserRoles()
```

**Get a specific role:**
```
getUserRole(userRoleId="<userRoleId>")
```

---

### Create a user

**Create a new user:**
```
createUser(role="<roleName>", name="Jane Smith", badge_id="JS001")
```

- `role`: The role to assign (get valid role names from `listUserRoles`)
- `name`: Display name for the user
- `badge_id`: The badge ID used for shop floor login — must be unique

Use with caution — this creates a real user account in your Tulip instance. Confirm
name, role, and badge ID with the user before calling.

---

## Common patterns

### "Who's in this system?"
1. `listUsers()` — all users with names and roles
2. `listUserRoles()` — what roles exist
3. `getUser(userId)` on anyone you want more detail on

### "What groups does a user belong to?"
1. `listUserUserGroups(userId="<id>")` — returns group IDs
2. `getUserGroup(userGroupId)` on each to get group names

### "Who's in a specific group?"
1. `listUserGroups()` — find the group by name
2. `getUserGroupUsers(userGroupId="<id>")` — all members

---

## Tools used by this skill

| Tool | Purpose |
|---|---|
| `listUsers` | List all users |
| `getUser` | Get user details |
| `createUser` | Create a new user account |
| `listUserRoles` | List all roles |
| `getUserRole` | Get role details |
| `listUserGroups` | List all user groups |
| `getUserGroup` | Get user group details |
| `getUserGroupUsers` | List members of a user group |
| `listUserUserGroups` | List groups a user belongs to |
