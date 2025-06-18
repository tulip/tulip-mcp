# Tulip MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to the Tulip API, enabling LLMs to interact
with the Tulip manufacturing platform functionality including tables, records, machines, stations, interfaces, users,
and more.

## Features

This MCP server provides **71 Tulip API tools** organized across multiple categories:

- **📱 Stations & Interfaces** (24 tools) - Station management, interface assignments, app configurations
- **👥 Users & Access Control** (9 tools) - User management, roles, groups, permissions
- **📊 Tables & Records** (28 tools) - Data tables, records, queries, aggregations, links
- **🏭 Machines** (4 tools) - Machine monitoring, attributes, activity archives
- **📱 Apps & Content** (5 tools) - App group management
- **🔧 Utilities** (1 tool) - URL signing and cloud storage

> 📚 **For detailed tool documentation, parameters, and examples, see [tools.md](tools.md)**

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- A Tulip instance
- Tulip API credentials (API key and secret)

### Installation

- **Node.js**: This is a JavaScript runtime that lets you run the server.
  - **Download Node.js**: [Click here to download Node.js (LTS version recommended)](https://nodejs.org/en/download/)
- **Git**: This is a version control system used to download the server code.
  - **Download Git**: [Click here to download Git](https://git-scm.com/downloads)

Install both of these with the default options. You may need to restart your computer after installation.

---

### 2. Setup Instructions

Follow the instructions for your operating system.

<details>
<summary><b>Windows</b></summary>

1.  **Open Command Prompt:**
    -   Press the `Windows Key`, type `cmd`, and press `Enter`.

2.  **Navigate to Your Chosen Folder:**
    -   Choose a folder where you want to store the server and navigate into it. Replace `path\to\your\folder` with your actual folder path:
        ```cmd
        cd path\to\your\folder
        ```

3.  **Download the Server Code:**
    -   Copy and paste the following command and press `Enter`:
        ```cmd
        git clone https://github.com/tulip-ecosystem/tulip-mcp.git
        ```

4.  **Enter the Server Directory:**
    -   Type the following command and press `Enter`:
        ```cmd
        cd tulip-mcp
        ```

5.  **Install Dependencies:**
    -   This command downloads the necessary libraries for the server. Type the following and press `Enter`:
        ```cmd
        npm install
        ```

6.  **Create the Configuration File:**
    -   Copy the example configuration file. Type the following and press `Enter`:
        ```cmd
        copy env.example .env
        ```

</details>

<details>
<summary><b>macOS & Linux</b></summary>

1.  **Open Terminal:**
    -   **macOS**: Open `Finder`, go to `Applications` > `Utilities`, and open `Terminal`.
    -   **Linux**: Usually `Ctrl+Alt+T` or find it in your applications menu.

2.  **Navigate to Your Chosen Folder:**
    -   Choose a folder where you want to store the server and navigate into it. Replace `path/to/your/folder` with your actual folder path:
        ```bash
        cd path/to/your/folder
        ```

3.  **Download the Server Code:**
    -   Copy and paste the following command and press `Enter`:
        ```bash
        git clone https://github.com/tulip-ecosystem/tulip-mcp.git
        ```

4.  **Enter the Server Directory:**
    -   Type the following command and press `Enter`:
        ```bash
        cd tulip-mcp
        ```

5.  **Install Dependencies:**
    -   This command downloads the necessary libraries for the server. Type the following and press `Enter`:
        ```bash
        npm install
        ```

6.  **Create the Configuration File:**
    -   Copy the example configuration file. Type the following and press `Enter`:
        ```bash
        cp env.example .env
        ```

</details>

---

### 3. Configure Your Credentials

Now you need to add your Tulip API credentials to the server.

1.  **Open the `.env` file:**
    -   Navigate to the `tulip-mcp` folder (wherever you chose to download it).
    -   You will see a file named `.env`. Open this file with a simple text editor (like Notepad on Windows or TextEdit on macOS).

2.  **Edit the `.env` file:**
    -   You will see the following lines:
        ```env
        TULIP_API_KEY=your_api_key_here
        TULIP_API_SECRET=your_api_secret_here
        TULIP_BASE_URL=https://your-instance.tulip.co
        TULIP_WORKSPACE_ID=your_workspace_id_here_if_using_account_api_key
        ```
    -   Replace `your_api_key_here`, `your_api_secret_here`, and `https://your-instance.tulip.co` with your actual Tulip credentials.
    -   See the section below on how to get these credentials.

#### **How to Get Tulip API Credentials**

1.  Log in to your Tulip instance.
2.  Navigate to **Settings** > **API Tokens**.
3.  Create a new API token. Give it a name (e.g., "MCP Server").
4.  Make sure to grant it the necessary permissions (scopes):
   - `apps:read` - for app group operations
   - `machines:read`, `machines:write` - for machine operations
   - `attributes:write` - for attribute reporting
   - `users:read`, `users:write` - for user operations
   - `stations:read`, `stations:write` - for stations/interfaces operations
   - `tables:read`, `tables:write` - for table operations
   - `urls:sign` - for URL signing
5.  Copy the **API Key** and **Secret** and paste them into your `.env` file.
6.  Your instance URL is the URL you use to access Tulip (e.g., `https://my-company.tulip.co`).
7.  Your workspace ID is in your Tulip URL after `/w/`. For most users, this is `DEFAULT`.

⚠️ **Important**: The `TULIP_WORKSPACE_ID` is only required if you are using an Account API key (obtained from Account Settings). If you are using a Workspace API key (obtained from Workspace Settings), leave this field empty.

---

### 4. Running the Server

This server is designed to be run by an MCP-compatible client application (like an LLM agent or a chatbot). The client will start and stop the server 
automatically over `stdio`.

To connect the server, you need to configure your MCP client. Here is an example configuration:
```json
{
  "mcpServers": {
    "tulip-mcp": {
      "command": "node",
      "args": ["/path/to/your/tulip-mcp/src/index.js"]
    }
  }
}
```
**Important:**
- Replace `/path/to/your/tulip-mcp/src/index.js` with the **absolute path** to the `index.js` file on your computer.
- **Windows users:** Make sure to use forward slashes (`/`) or double backslashes (`\\`) in your path (e.g., `C:/Users/YourUser/Documents/tulip-mcp/src/
index.js`).

<details>
<summary><b>Guide: Claude Desktop</b></summary>

[Claude Desktop](https://modelcontextprotocol.io/quickstart/user) can be extended with MCP servers.

1.  From the Claude Desktop menu bar, select **Settings...** > **Developer** > **Edit Config**.
2.  This will open the `claude_desktop_config.json` file.
3.  Add the server configuration inside the `mcpServers` object as shown in the main example above.
    -   *Note: If other servers are already listed, add a comma before the `"tulip-mcp": { ... }` entry.*
    -   For Windows, ensure your path uses double backslashes (e.g., `C:\\Users\\YourUser\\Documents\\tulip-mcp\\src\\index.js`).
4.  Save the file and **restart Claude Desktop**.

> For more details, see the [official Claude Desktop MCP Quickstart](https://modelcontextprotocol.io/quickstart/user).

</details>


Once configured, your MCP client will run the server when it needs to. If you make any changes to your `.env` file, you must restart the server in your MCP Client for the changes to take effect.

---

## 🛠️ Developer Guide (Advanced)

This section contains more advanced configuration for developers.

### (Optional) Testing the Server

If you want to test the server directly to ensure it is configured correctly, you can run it from your command line.

Make sure you are in the `tulip-mcp` directory, then run:

```bash
npm start
```

The server will start and wait for a connection. You can stop it by pressing `Ctrl+C`.

### Tool Selection Configuration

By default, the server enables only `read-only` tools and `table` tools for safety. You can customize which tools are available using the `ENABLED_TOOLS` environment variable in your `.env` file.

The `ENABLED_TOOLS` variable accepts a comma-separated list that can include:

- **Individual tool names**: Specific tools like `listStations`
- **Categories**: Security-based groupings (`read-only`, `write`, `admin`)
- **Types**: Resource-based groupings (`table`, `machine`, `user`, `app`, `interface`, `station`, `station-group`, `utility`)

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

#### Available Categories

- **`read-only`**: Safe operations that only read data (30 tools)
- **`write`**: Operations that create or modify data (28 tools)
- **`admin`**: Dangerous operations like deletions and archiving (13 tools)

#### Available Types

- **`table`**: Table and record operations (28 tools)
- **`machine`**: Machine-related operations (4 tools)
- **`user`**: User management operations (9 tools)
- **`app`**: App group operations (5 tools)
- **`interface`**: Interface management operations (7 tools)
- **`station`**: Station management operations (9 tools)
- **`station-group`**: Station group management operations (9 tools)
- **`utility`**: Helper operations like URL signing (1 tool)

⚠️ **Security Note**: Admin tools can permanently delete data or archive resources. Only enable them if you understand the risks.

### API Documentation

For detailed tool documentation including:

- Complete parameter lists and examples for each tool
- API endpoints and HTTP methods
- Required scopes and permissions
- Usage examples and return values
- Error handling and troubleshooting

**👉 Generate `tools.md` for comprehensive API documentation by running `npm run docs`**

## API Scopes Required

Your API token needs appropriate scopes for the tools you want to use:

### Basic Scopes

- **Read Operations**: `stations:read`, `users:read`, `tables:read`, `machines:read`, `apps:read`
- **Write Operations**: `stations:write`, `users:write`, `tables:write`, `machines:write`
- **Special Functions**: `attributes:write`, `urls:sign`

### Quick Start Scope

```
stations:read,users:read,tables:read,machines:read,apps:read,urls:sign
```

## Support

For detailed documentation, troubleshooting, and examples:

- **Tool Reference**: See `tools.md`. This file can be generated by running `npm run docs`.
- **Tulip Documentation**: Visit `https://support.tulip.co/apidocs`
