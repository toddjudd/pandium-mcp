# pandium-mcp

MCP server for the [Pandium](https://pandium.com) sandbox API. Exposes Pandium resources as tools for Copilot and other MCP-aware AI agents.

## Tools

| Tool | Description |
|---|---|
| `pandium_list_integrations` | List all integrations |
| `pandium_get_integration` | Get a single integration by ID |
| `pandium_list_releases` | List releases for an integration |
| `pandium_get_latest_release` | Get the latest release for an integration |
| `pandium_create_build` | **Create a build/release** (the main one for test releases) |
| `pandium_list_tenants` | List tenants, optionally filtered by integration |
| `pandium_trigger_sync` | Trigger an init or normal sync for a tenant |
| `pandium_get_run_status` | Check the status of a triggered run |

## Setup

### 1. Get an API key

In the Pandium sandbox Integration Hub: **Settings → API Access → Generate key**

Keys are only shown at creation time — store it securely.

### 2. Install & build

```bash
npm install
npm run build
```

### 3. Configure VS Code

Open the project in VS Code. The `.vscode/mcp.json` registers the server. VS Code will prompt for your `PANDIUM_API_KEY` when the server starts.

Alternatively, copy `.env.example` to `.env` and fill in your key, then update `.vscode/mcp.json` to pass it directly:

```json
"env": {
  "PANDIUM_API_KEY": "your_key_here"
}
```

### 4. Use in Copilot

Once the server is running, you can ask Copilot things like:

- "List my Pandium integrations"
- "Create a build for integration 42 tagged v2.3.1-test"
- "Trigger an init sync for tenant 99"
- "What's the status of trigger abc123?"

## Creating a test release

The typical flow for building a test release:

1. Push a git tag to your integration's tracked branch
2. Ask Copilot: *"Create a build for integration {id} tagged {your-tag}"*
3. Copilot calls `pandium_create_build` → Pandium builds the release
4. Ask: *"List releases for integration {id}"* to confirm it appeared

## API reference

Sandbox base URL: `https://api.sandbox.pandium.com`  
Docs: https://docs.pandium.com/reference/pandium-api
