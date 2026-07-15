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

The plugin's persistent data directory is:

```
~/.claude/plugins/data/tulip-marketplace/
```

If that exact directory does not exist yet, it will be created in the next step. Do
not guess a different path — use exactly this one.

## Steps

1. Ask the user for the full path to their filled-in `.env` file. Example prompt:
   "What's the full path to your Tulip `.env` file? (e.g. `C:\Users\you\Documents\tulip.env`)"

2. Confirm the file exists before copying (list metadata only, never contents):
   ```
   ls -la "<user-provided-path>"
   ```
   If it does not exist, tell the user and ask again. Do not proceed.

3. Copy it into the plugin's persistent data directory (create the dir if needed) and
   restrict permissions so only the owner can read it:
   ```
   mkdir -p ~/.claude/plugins/data/tulip-marketplace
   cp "<user-provided-path>" ~/.claude/plugins/data/tulip-marketplace/.env
   chmod 600 ~/.claude/plugins/data/tulip-marketplace/.env
   ```
   Never open, cat, or print the file's contents.

4. Confirm the copy landed (metadata only):
   ```
   ls -la ~/.claude/plugins/data/tulip-marketplace/.env
   ```

5. Tell the user to reload the plugin so the server picks up the credentials:
   "Credentials are in place. Run `/reload-plugins` (or restart Claude Code) to connect."

## Notes
- Because the file lives in the persistent data directory, it survives future plugin
  updates — the user does this once (until their credentials change).
- If the user later changes credentials, re-run this skill with the new file.
- If the user is running the server standalone (not as a plugin), a `.env` in the repo
  root is used instead — this skill is only needed for plugin installs.
- The `ENABLED_TOOLS` environment variable in `.env` controls which tools are active.
  Default is `read-only`. To enable write tools, set `ENABLED_TOOLS=table,read-only,write`
  or specific categories. See `env.example` for full options.
