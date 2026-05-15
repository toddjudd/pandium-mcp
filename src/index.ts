import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  listIntegrations,
  getIntegration,
  listReleases,
  getLatestRelease,
  createBuild,
  listTenants,
  triggerSync,
  getRunStatus,
} from "./pandium.js";

const server = new McpServer({
  name: "pandium-mcp",
  version: "0.1.0",
});

// ── Integrations ──────────────────────────────────────────────────────────────

server.tool(
  "pandium_list_integrations",
  "List all integrations in the Pandium sandbox account",
  {
    limit: z.number().int().min(1).max(500).optional().describe("Max results (default 100)"),
    skip: z.number().int().min(0).optional().describe("Records to skip for pagination"),
    archived: z.boolean().optional().describe("Include archived integrations"),
  },
  async (params) => {
    const data = await listIntegrations(params);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  "pandium_get_integration",
  "Get details for a single Pandium integration by ID",
  {
    integration_id: z.number().int().describe("Integration ID"),
  },
  async ({ integration_id }) => {
    const data = await getIntegration(integration_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  "pandium_list_releases",
  "List all releases for a Pandium integration",
  {
    integration_id: z.number().int().describe("Integration ID"),
  },
  async ({ integration_id }) => {
    const data = await listReleases(integration_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  "pandium_get_latest_release",
  "Get the latest release for a Pandium integration",
  {
    integration_id: z.number().int().describe("Integration ID"),
  },
  async ({ integration_id }) => {
    const data = await getLatestRelease(integration_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Builds ────────────────────────────────────────────────────────────────────

server.tool(
  "pandium_create_build",
  "Create a build (release) for a Pandium integration. The tag should be a git tag or version string (e.g. v1.2.3). Mode 'init' is for first-time setup; 'normal' for regular syncs.",
  {
    integration_id: z.number().int().describe("Integration ID to build"),
    tag: z.string().describe("Git tag or version string to build (e.g. v1.2.3)"),
    mode: z
      .enum(["init", "normal"])
      .optional()
      .default("normal")
      .describe("Build mode: 'init' or 'normal' (default: normal)"),
  },
  async ({ integration_id, tag, mode }) => {
    const data = await createBuild({ integration_id, tag }, mode);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Tenants ───────────────────────────────────────────────────────────────────

server.tool(
  "pandium_list_tenants",
  "List tenants in the Pandium sandbox account, optionally filtered by integration",
  {
    integration_id: z.number().int().optional().describe("Filter by integration ID"),
    limit: z.number().int().min(1).max(500).optional().describe("Max results (default 100)"),
    skip: z.number().int().min(0).optional().describe("Records to skip for pagination"),
    archived: z.boolean().optional().describe("Include archived tenants"),
  },
  async (params) => {
    const data = await listTenants(params);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  "pandium_trigger_sync",
  "Trigger a sync run for a tenant. Use mode 'init' to reset state; 'normal' for a regular sync.",
  {
    tenant_id: z.number().int().describe("Tenant ID to sync"),
    mode: z
      .enum(["init", "normal"])
      .optional()
      .default("normal")
      .describe("Sync mode: 'init' or 'normal' (default: normal)"),
  },
  async ({ tenant_id, mode }) => {
    const data = await triggerSync(tenant_id, mode);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// ── Runs ──────────────────────────────────────────────────────────────────────

server.tool(
  "pandium_get_run_status",
  "Get the status of a run using the trigger_id returned from a sync request. Note: status may not be immediately available (triggers are debounced).",
  {
    trigger_id: z.string().describe("Trigger ID returned from a sync request"),
  },
  async ({ trigger_id }) => {
    const data = await getRunStatus(trigger_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    };
  }
);

// ── Start ─────────────────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
