#!/bin/bash
set -e

# Default mode is studio (traditional MCP server)
MCP_MODE=${MCP_MODE:-studio}

echo "Starting Tulip MCP Server in ${MCP_MODE} mode..."

case "$MCP_MODE" in
  "studio")
    echo "Running in Studio mode (traditional MCP server)"
    echo "API Configuration:"
    echo "  Base URL: ${TULIP_BASE_URL}"
    echo "  API Key Type: $([ -z "$TULIP_WORKSPACE_ID" ] && echo "Workspace API Key" || echo "Account API Key (Workspace: $TULIP_WORKSPACE_ID)")"
    echo "  Enabled Tools: ${ENABLED_TOOLS:-read-only}"

    exec node /app/src/index.js "$@"
    ;;
  "supergateway")
    echo "Running in Supergateway mode (SSE/WebSocket)"
    echo "API Configuration:"
    echo "  Base URL: ${TULIP_BASE_URL}"
    echo "  API Key Type: $([ -z "$TULIP_WORKSPACE_ID" ] && echo "Workspace API Key" || echo "Account API Key (Workspace: $TULIP_WORKSPACE_ID)")"
    echo "  Enabled Tools: ${ENABLED_TOOLS:-read-only}"
    echo "  Gateway Port: ${GATEWAY_PORT:-3000}"

    # Build the supergateway command arguments
    ARGS=(
      --outputTransport sse
      --port "${GATEWAY_PORT:-3000}"
      --cors
    )

    # Add authentication if provided
    if [ -n "$AUTH_TOKEN" ]; then
      ARGS+=(--oauth2Bearer "$AUTH_TOKEN")
      echo "  Authentication: Bearer token enabled"
    else
      echo "  Authentication: None"
    fi

    # Add custom headers if provided
    if [ -n "$CUSTOM_HEADERS" ]; then
      # Split headers by semicolon
      IFS=';' read -ra HEADERS <<< "$CUSTOM_HEADERS"
      for header in "${HEADERS[@]}"; do
        ARGS+=(--header "$header")
      done
      echo "  Custom Headers: ${#HEADERS[@]} headers added"
    fi

    # Use the MCP server directly via stdio
    ARGS+=(--stdio "node /app/src/index.js")

    # Execute supergateway with the MCP server
    echo "Starting supergateway bridge..."
    exec supergateway "${ARGS[@]}" "$@"
    ;;
  *)
    echo "Error: Invalid MCP_MODE '${MCP_MODE}'. Valid options are: studio, supergateway"
    exit 1
    ;;
esac
