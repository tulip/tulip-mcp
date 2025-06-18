# Tulip MCP Server

A Model Context Protocol (MCP) server that provides comprehensive access to the Tulip API, enabling LLMs to interact
with the Tulip manufacturing platform functionality including tables, records, machines, stations, interfaces, users,
and more.

## 🚀 Getting Started

There are two ways to use this server. For most users, we recommend the **Quick Start** method using `npx`. For those who want to run the server via STDIO, the **Manual Installation** method is also available.

### Quick Start (Recommended)

This method lets you run the server without downloading any code. It's the fastest way to get started.

1.  **Configure Your Credentials**

    Create a file named `.env` in a folder of your choice. Copy and paste the following, replacing the placeholders with your actual Tulip credentials. For details on getting an API Key and Secret, see the "How to Get Tulip API Credentials" section below.
    - Your `TULIP_BASE_URL` is the URL you use to access Tulip (e.g., `https://my-company.tulip.co`).
    - Your `TULIP_WORKSPACE_ID` is in your Tulip URL after `/w/` (for most users, this is `DEFAULT`).

    ```env
    TULIP_API_KEY=your_api_key_here
    TULIP_API_SECRET=your_api_secret_here
    TULIP_BASE_URL=https://your-instance.tulip.co
    TULIP_WORKSPACE_ID=your_workspace_id_here_if_using_account_api_key
    ```
    ⚠️ **Important**: The `TULIP_WORKSPACE_ID` is only required if you are using an Account API key (obtained from Account Settings). If you are using a Workspace API key (obtained from Workspace Settings), you can leave this field empty.

2.  **Run the Server**

    Open your terminal or command prompt, navigate to the folder containing your `.env` file, and run:

    ```bash
    npx @tulip/mcp-server
    ```

    The server will start and is now ready to be connected to an MCP client like Claude Desktop or Cursor.

---
### Manual Installation (STDIO)

Follow these steps if you want to download the server's source code to make changes or contribute.

1.  **Prerequisites**

    -   **Node.js**: A JavaScript runtime. [Download here (LTS version recommended)](https://nodejs.org/en/download/).
    -   **Git**: A version control system. [Download here](https://git-scm.com/downloads).
    
    Install both with the default options. You may need to restart your computer.

2.  **Setup Instructions**

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

3.  **Configure Your Credentials**

    Open the `.env` file you created and add your Tulip credentials. For details on getting an API Key and Secret, see the "How to Get Tulip API Credentials" section below.
    - Your `TULIP_BASE_URL` is the URL you use to access Tulip (e.g., `https://my-company.tulip.co`).
    - Your `TULIP_WORKSPACE_ID` is in your Tulip URL after `/w/` (for most users, this is `DEFAULT`).
    
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
    
    ⚠️ **Important**: The `TULIP_WORKSPACE_ID` is only required if you are using an Account API key (obtained from Account Settings). If you are using a Workspace API key (obtained from Workspace Settings), you can leave this field empty.

4.  **Running the Server Manually**

    To test the server directly, run this command from the `tulip-mcp` directory:
    
    ```bash
    npm start
    ```
    
    The server will start and wait for a connection. You can stop it by pressing `Ctrl+C`.

---

## 🔌 Connecting to an MCP Client

Once the server is running (either via `npx` or `npm start`), you need to tell your client application how to connect to it.

Your client needs a command to run the server. Use one of the following setups:

*   **If you used the Quick Start (`npx`) method:** The client can run the server from anywhere. This is the simplest option.
    ```json
    {
      "mcpServers": {
        "tulip-mcp": {
          "command": "npx @tulip/mcp-server"
        }
      }
    }
    ```
*   **If you used the Manual Installation method:** You must provide the full, absolute path to the server's entry point.
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
    *   **Windows users:** Remember to use forward slashes (`/`) or double backslashes (`\\`) in your path.

<details>
<summary><b>Guide: Claude Desktop</b></summary>

1.  From the Claude Desktop menu bar, select **Settings...** > **Developer** > **Edit Config**.
2.  This will open the `claude_desktop_config.json` file.
3.  Add the server configuration inside the `mcpServers` object as shown in the examples above. Choose the `npx` or manual path option based on how you set up the server.
4.  Save the file and **restart Claude Desktop**.

> For more details, see the [official Claude Desktop MCP Quickstart](https://modelcontextprotocol.io/quickstart/user).

</details>

<details>
<summary><b>Guide: Cursor</b></summary>

For the easiest setup, click the button below. This will configure Cursor to run the server using `npx`. No path configuration is needed.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/install-mcp?name=tulip-mcp&config=eyJjb21tYW5kIjoibnB4IEB0dWxpcC9tY3Atc2VydmVyIn0%3D)

If you installed manually and need to specify a path, click the button and then **edit the `Command` field** in the dialog to provide the correct absolute path to the `index.js` file inside your downloaded `tulip-mcp` folder.

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
