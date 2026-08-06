---
name: setup-credentials
description: "Set up or update the Tulip MCP plugin's credentials. Use when the server reports missing/invalid credentials, when the user says the plugin isn't authenticated, or right after installing the plugin. Copies the user's existing .env into the plugin's persistent data directory so it survives updates."
---

# Set up Tulip MCP credentials

## Keywords
setup credentials, configure plugin, .env, not authenticated, login failed, missing api key, first run, install setup, credentials not found, reconnect tulip, api key, api secret, base url, workspace id

## Overview

The Tulip MCP plugin reads credentials from a `.env` file in its persistent data
directory, which survives plugin updates. This skill helps the user place that file.

**Important — never ask the user to paste credentials into this chat.** Credentials
(API keys, passwords) must not be typed into the conversation. This skill asks only
for the *path* to the user's existing `.env` file and copies it into place. Do not
read, cat, or print the file's contents at any point.

## What credentials are needed

The `.env` file requires these values:

| Variable | Required | Description |
|---|---|---|
| `TULIP_API_KEY` | Yes | API key from your Tulip instance |
| `TULIP_API_SECRET` | Yes | Corresponding API secret |
| `TULIP_BASE_URL` | Yes | Your instance URL, e.g. `https://your-instance.tulip.co` |
| `TULIP_WORKSPACE_ID` | Account keys only | Usually `DEFAULT` — not needed for Workspace API keys |

API keys are created in your Tulip instance under **Settings → API Keys**. Workspace
API keys (an enterprise feature) do not require `TULIP_WORKSPACE_ID`. Account API
keys do.

## Prerequisite: the user needs an .env file

If the user does not already have a `.env` file, point them to the template
`env.example` in the plugin repo. Tell them to copy it to a file named `.env`, fill in
their values in a text editor, and save it somewhere they can find (e.g. their
Documents folder). Do not ask them to share the values here.

## Resolving the data directory path

The plugin's persistent data directory is derived from the plugin identifier. For
standard marketplace installs, the identifier is `tulip@tulip-marketplace`, which
resolves to:

```
~/.claude/plugins/data/tulip-tulip-marketplace/
```

To confirm the correct path at runtime, read `~/.claude/plugins/installed_plugins.json`
and find the key that starts with `tulip@`. The data directory name is that key with
every non-alphanumeric character replaced by a hyphen. For example, `tulip@tulip-marketplace`
becomes `tulip-tulip-marketplace`.

## Steps

Commands below are given for POSIX shells (macOS, Linux, and Git Bash on Windows)
and for PowerShell. Pick the set that matches the user's shell.

1. Discover the data directory by reading `~/.claude/plugins/installed_plugins.json`
   with the Read tool. Find the key matching `tulip@*` in the `plugins` object.
   Replace every non-alphanumeric character in that key with `-` to get the directory
   name. The full path is `~/.claude/plugins/data/<directory-name>/`.

2. Ask the user for the full path to their filled-in `.env` file. Example prompt:
   "What's the full path to your Tulip `.env` file? (e.g. `/Users/you/Documents/tulip.env`
   or `C:\Users\you\Documents\tulip.env`)"

3. Confirm the file exists before copying (list metadata only, never contents):
   ```bash
   ls -la "<user-provided-path>"
   ```
   ```powershell
   Get-Item "<user-provided-path>" | Select-Object FullName, Length, LastWriteTime
   ```
   If it does not exist, tell the user and ask again. Do not proceed.

4. Copy it into the plugin's persistent data directory, creating the directory if
   needed:
   ```bash
   mkdir -p ~/.claude/plugins/data/<directory-name>
   cp "<user-provided-path>" ~/.claude/plugins/data/<directory-name>/.env
   chmod 600 ~/.claude/plugins/data/<directory-name>/.env
   ```
   ```powershell
   New-Item -ItemType Directory -Force -Path "$HOME\.claude\plugins\data\<directory-name>"
   Copy-Item "<user-provided-path>" "$HOME\.claude\plugins\data\<directory-name>\.env"
   ```
   The `chmod` step restricts the file to the owner and applies to POSIX shells only.
   On Windows, the file inherits the user profile's permissions, which are already
   limited to that user — tell the user this rather than trying to set an ACL.
   Never open, cat, or print the file's contents.

5. Confirm the copy landed (metadata only):
   ```bash
   ls -la ~/.claude/plugins/data/<directory-name>/.env
   ```
   ```powershell
   Get-Item "$HOME\.claude\plugins\data\<directory-name>\.env" | Select-Object FullName, Length, LastWriteTime
   ```

6. Tell the user to reload the plugin so the server picks up the credentials:
   "Credentials are in place. Run `/reload-plugins` (or restart Claude Code) to connect."

## Notes
- Because the file lives in the persistent data directory, it survives future plugin
  updates — the user does this once (until their credentials change).
- If the user later changes credentials, re-run this skill with the new file.
- If the user is running the server standalone (not as a plugin), a `.env` in the repo
  root is used instead — this skill is only needed for plugin installs.
- The `ENABLED_TOOLS` environment variable in `.env` controls which tools are active.
  Default is `read-only`, which exposes 30 of the 71 tools. To enable write tools, set
  `ENABLED_TOOLS=read-only,write` or a list of specific categories, types, or tool
  names. See `env.example` for full options.
