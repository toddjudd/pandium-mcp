# pandium-mcp

MCP server for the [Pandium](https://pandium.com) API. Exposes Pandium resources as tools for OpenCode, Copilot, and other MCP-aware AI agents.

Supports both **sandbox** and **production** environments via separate server instances.

## Tools

| Tool                         | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `pandium_list_integrations`  | List all integrations                                       |
| `pandium_get_integration`    | Get a single integration by ID                              |
| `pandium_list_releases`      | List releases for an integration                            |
| `pandium_get_latest_release` | Get the latest release for an integration                   |
| `pandium_create_build`       | **Create a build/release** (the main one for test releases) |
| `pandium_list_tenants`       | List tenants, optionally filtered by integration            |
| `pandium_trigger_sync`       | Trigger an init or normal sync for a tenant                 |
| `pandium_get_run_status`     | Check the status of a triggered run                         |

## Setup

### 1. Get API keys

In the Pandium Integration Hub: **Settings → API Access → Generate key**

- Sandbox hub: `https://app.sandbox.pandium.com`
- Production hub: `https://app.pandium.io`

Keys are only shown at creation time — store them securely!

### 2. Install & build

```bash
npm install
npm run build
```

### 3. Store the keys in 1Password (recommended)

Keep the keys in 1Password and let `op run` resolve them at launch, so nothing
secret is written to disk or committed.

**Create the items** (use whatever vault your team uses for shared credentials):

```bash
op item create --category=login \
  --title="Pandium Sandbox API" \
  --vault="<your-vault>" \
  api_key=YOUR_SANDBOX_KEY

op item create --category=login \
  --title="Pandium Production API" \
  --vault="<your-vault>" \
  api_key=YOUR_PRODUCTION_KEY
```

The key reference is `op://<vault>/<item title>/api_key`. Confirm it resolves:

```bash
op read "op://<vault>/Pandium Sandbox API/api_key"
```

> **Gotchas learned the hard way:**
>
> - If your vault **name contains a space or `&`**, the `op://` string is invalid.
>   Use the **vault ID** instead (`op vault list` to find it).
> - Keep **exactly one** item per title. Duplicates make `op` fail with
>   "More than one item matches".
> - Add `--account <shorthand>` to `op` commands if you're signed into multiple
>   1Password accounts.

### 4. Configure OpenCode

Add to `~/.config/opencode/opencode.jsonc`. Note the command is wrapped in
**`op run`** — OpenCode does **not** resolve `op://` URIs itself, so `op run`
resolves `PANDIUM_API_KEY` at startup and passes the real value to `node`:

```jsonc
{
  "mcp": {
    "pandium-sandbox": {
      "type": "local",
      "command": [
        "op",
        "run",
        "--account",
        "<account>",
        "--",
        "node",
        "/abs/path/to/pandium-mcp/build/index.js",
      ],
      "enabled": true,
      "environment": {
        "PANDIUM_ENV": "sandbox",
        "PANDIUM_API_KEY": "op://<vault>/Pandium Sandbox API/api_key",
      },
    },
    "pandium-prod": {
      "type": "local",
      "command": [
        "op",
        "run",
        "--account",
        "<account>",
        "--",
        "node",
        "/abs/path/to/pandium-mcp/build/index.js",
      ],
      "enabled": false, // enable when you need production
      "environment": {
        "PANDIUM_ENV": "production",
        "PANDIUM_API_KEY": "op://<vault>/Pandium Production API/api_key",
      },
    },
  },
}
```

Each enabled server runs its own `op run`, so 1Password prompts **once per enabled
server** at OpenCode startup (two prompts with both enabled). Approve them and the
servers come up. Disable `pandium-prod` if you only need sandbox (one prompt).

> Requires the [1Password CLI](https://developer.1password.com/docs/cli/) with
> desktop-app integration enabled (Settings → Developer → "Integrate with
> 1Password CLI") so `op run` can authorize via biometrics.

### Alternative: environment variables (no 1Password)

If you don't use 1Password, drop the `op run` wrapper and pass the key directly.
You can reference a shell env var with OpenCode's `{env:...}` substitution:

```jsonc
"command": ["node", "/abs/path/to/pandium-mcp/build/index.js"],
"environment": {
  "PANDIUM_ENV": "sandbox",
  "PANDIUM_API_KEY": "{env:PANDIUM_SANDBOX_API_KEY}"
}
```

with `PANDIUM_SANDBOX_API_KEY` exported in your shell profile.

### 5. Configure VS Code (optional)

The `.vscode/mcp.json` is configured for sandbox use. VS Code will prompt for your
API key when the server starts.

## Environment Configuration

The server behavior is controlled by two environment variables:

| Variable          | Values                            | Description                             |
| ----------------- | --------------------------------- | --------------------------------------- |
| `PANDIUM_ENV`     | `sandbox` (default), `production` | Which Pandium environment to connect to |
| `PANDIUM_API_KEY` | string                            | API key for the selected environment    |

**API Base URLs:**

- Sandbox: `https://api.sandbox.pandium.com`
- Production: `https://api.pandium.io`

## Usage Examples

### List integrations

```
List my Pandium integrations
```

### Create a test build from a PR

```
Create a Pandium build for integration 42 tagged PR-123-test
```

### Trigger a sync

```
Trigger an init sync for tenant 99
```

### Check run status

```
What's the status of trigger abc123?
```

## PR-Triggered Build Workflow

Typical flow for testing a PR with Pandium:

1. Push changes to your integration repo and create a PR
2. Push a git tag (e.g., `PR-123-test`) to the tracked branch
3. Ask OpenCode: _"Create a Pandium build for integration {id} tagged PR-123-test"_
4. OpenCode calls `pandium_create_build` → Pandium builds the release
5. Ask: _"List releases for integration {id}"_ to confirm
6. Optionally trigger a test sync: _"Trigger sync for tenant {id}"_

## API Reference

- Sandbox: `https://api.sandbox.pandium.com`
- Production: `https://api.pandium.io`
- Docs: https://docs.pandium.com/reference/pandium-api

## Development

```bash
npm run build         # compile TypeScript to build/
npm run dev           # compile in watch mode
npm run typecheck     # type-check without emitting
npm run lint          # ESLint
npm run lint:fix      # ESLint with autofix
npm run format        # Prettier write
npm run format:check  # Prettier check (CI-friendly)
npm run check         # format:check + lint + typecheck
```

Run `npm run check` before pushing. Tooling:

- **Prettier** — formatting (`.prettierrc.json`, 100-col, double quotes)
- **ESLint** (flat config, `typescript-eslint`) — linting (`eslint.config.js`)
- **EditorConfig** (`.editorconfig`) — editor defaults

> Note: `npm audit` reports transitive advisories via
> `@modelcontextprotocol/sdk` → `express` → `qs`. This server uses the **stdio**
> transport, so that HTTP stack is never exercised at runtime. The advisories
> resolve when the upstream SDK bumps its dependencies.

### CI

`.github/workflows/ci.yml` runs `npm run check` and `npm run build` on every pull
request and on pushes to `main`.

## License

[MIT](./LICENSE)
