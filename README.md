# Tulip MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to the Tulip API, enabling LLMs to interact
with the Tulip manufacturing platform functionality including tables, records, machines, stations, interfaces, users,
and more.

## 🚀 Getting Started

This guide will walk you through running the server and connecting it to an MCP client like Cursor or Claude Desktop.

### 1. Configure Your Credentials

Create a file named `.env` in a folder of your choice. Copy and paste the following, replacing the placeholders with your actual Tulip credentials.
- Your `TULIP_BASE_URL` is the URL you use to access Tulip (e.g., `https://my-company.tulip.co`).
- Your `TULIP_WORKSPACE_ID` is in your Tulip URL after `/w/` (for most users, this is `DEFAULT`).

```env
TULIP_API_KEY=your_api_key_here
TULIP_API_SECRET=your_api_secret_here
TULIP_BASE_URL=https://your-instance.tulip.co
TULIP_WORKSPACE_ID=your_workspace_id_here_if_using_account_api_key
```
⚠️ **Important**: The `TULIP_WORKSPACE_ID` is only required if you are using an Account API key (obtained from Account Settings). If you are using a Workspace API key (obtained from Workspace Settings), you can leave this field empty.

### 2. Run the Server

Open your terminal or command prompt, navigate to the folder containing your `.env` file, and run:

```bash
npx @tulip/mcp-server
```

The server will start and is now ready to be connected to an MCP client.

---

## 🔌 Connecting to an MCP Client

When using a client, the server is run in a different environment where it may not find your `.env` file automatically. To solve this, you must provide the full path to your `.env` file using the `--env` flag.

<details>
<summary><b>Guide: Finding Your .env File Path</b></summary>

1.  Navigate to the folder where you created your `.env` file.
2.  **On Windows:** Right-click the `.env` file while holding down the `Shift` key, then select **"Copy as path"**.
3.  **On macOS:** Right-click the `.env` file, hold down the `Option` key, then select **"Copy .env as Pathname"**.
4.  You will use this copied path in the client configuration below.

</details>

<details>
<summary><b>Guide: Claude Desktop</b></summary>

1.  From the Claude Desktop menu bar, select **Settings...** > **Developer** > **Edit Config**.
2.  This will open the `claude_desktop_config.json` file.
3.  Add the server configuration inside the `mcpServers` object. **You must replace `"C:\\path\\to\\your\\.env"` with the actual path you copied.**
    ```json
    {
      "mcpServers": {
        "tulip-mcp": {
          "command": "npx",
          "args": [
            "@tulip/mcp-server",
            "--env",
            "C:\\path\\to\\your\\.env"
          ]
        }
      }
    }
    ```
4.  Save the file and **restart Claude Desktop**.

> For more details, see the [official Claude Desktop MCP Quickstart](https://modelcontextprotocol.io/quickstart/user).

</details>

<details>
<summary><b>Guide: Cursor</b></summary>

For the easiest setup, click the button below. This will pre-fill the command.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=tulip-mcp&config=eyJjb21tYW5kIjoibnB4IEB0dWxpcC9tY3Atc2VydmVyIC0tZW52IEM6XFxwYXRoXFx0b1xceW91clxcLmVudiJ9)

After clicking the button, **you must replace the placeholder text** (`REPLACE_WITH_YOUR_ENV_FILE_PATH_HERE`) with the full path to your `.env` file that you copied earlier.

</details>

---

## 🛠️ Developer Guide

This section contains more advanced configuration features.

### Tool Selection Configuration

By default, the server enables only `read-only` tools and `table` tools for safety. You can customize which tools are available using the `ENABLED_TOOLS` environment variable in your `.env` file.

The `ENABLED_TOOLS` variable accepts a comma-separated list that can include:

-   **Individual tool names**: Specific tools like `listStations`
-   **Categories**: Security-based groupings (`read-only`, `write`, `admin`)
-   **Types**: Resource-based groupings (`table`, `machine`, `user`, `app`, `interface`, `station`, `station-group`, `utility`)

#### Examples

```env
# Enable specific tools only
ENABLED_TOOLS=listTables,getTable,listStations,listInterfaces

# Enable by security category
ENABLED_TOOLS=read-only,write

# Enable by resource type
ENABLED_TOOLS=table,station,interface

# Mixed approach (recommended)
ENABLED_TOOLS=read-only,interface,station,user

# Enable everything (use with caution)
ENABLED_TOOLS=read-only,write,admin
```

### API Documentation

For detailed tool documentation including complete parameter lists, examples, and required permissions, **generate the `TOOLS.md` file by running `npm run docs`**.

### How to Get Tulip API Credentials

1.  Log in to your Tulip instance.
2.  Navigate to **Settings** > **API Tokens**.
3.  Create a new API token. Give it a name (e.g., "MCP Server").
4.  Make sure to grant it the necessary permissions (scopes). A good starting set for read-only access is:
    `stations:read,users:read,tables:read,machines:read,apps:read,urls:sign`
5.  Copy the **API Key** and **Secret** and paste them into your `.env` file.

⚠️ **Important**: The `TULIP_WORKSPACE_ID` is only required if you are using an Account API key (obtained from Account Settings). If you are using a Workspace API key (obtained from Workspace Settings), you can leave this field empty.
