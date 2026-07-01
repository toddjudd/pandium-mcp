// Environment is determined by PANDIUM_ENV variable (defaults to "sandbox")
// This allows running separate server instances for sandbox vs production
const PANDIUM_ENV = process.env.PANDIUM_ENV || "sandbox";

const BASE_URLS: Record<string, string> = {
  sandbox: "https://api.sandbox.pandium.com",
  production: "https://api.pandium.io",
};

const BASE_URL = BASE_URLS[PANDIUM_ENV];
if (!BASE_URL) {
  throw new Error(`Invalid PANDIUM_ENV: "${PANDIUM_ENV}". Must be "sandbox" or "production".`);
}

function getApiKey(): string {
  const key = process.env.PANDIUM_API_KEY;
  if (!key) throw new Error("PANDIUM_API_KEY environment variable is not set");
  // Trim to guard against trailing newlines from secret managers (e.g. `op run`)
  return key.trim();
}

// Export environment info for use in tool descriptions
export const environment = PANDIUM_ENV;
export const baseUrl = BASE_URL;

async function pandiumFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "X-API-KEY": getApiKey(),
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Pandium API error ${response.status}: ${body}`);
  }

  // 204 / empty body
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

// ── Integrations ──────────────────────────────────────────────────────────────

export interface Integration {
  id: number;
  name: string;
  long_name: string;
  repository_url: string;
  repository_tracking_branch: string;
  default_release_id: number;
  default_release_channel: string;
}

export interface Release {
  id: number;
  name: string;
  tag: string;
  run_command: string;
  repository_tracking_branch: string;
  config_schema: Record<string, unknown>;
  metadata_schema: Record<string, unknown>;
  created_date: string;
  modified_date: string;
}

export function listIntegrations(params?: {
  limit?: number;
  skip?: number;
  archived?: boolean;
}): Promise<Integration[]> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.skip != null) qs.set("skip", String(params.skip));
  if (params?.archived != null) qs.set("archived", String(params.archived));
  const query = qs.toString();
  return pandiumFetch<Integration[]>(`/v2/integrations${query ? `?${query}` : ""}`);
}

export function getIntegration(integrationId: number): Promise<Integration> {
  return pandiumFetch<Integration>(`/v2/integrations/${integrationId}`);
}

export function listReleases(integrationId: number): Promise<Release[]> {
  return pandiumFetch<Release[]>(`/v2/integrations/${integrationId}/releases`);
}

export function getLatestRelease(integrationId: number): Promise<Release> {
  return pandiumFetch<Release>(`/v2/integrations/${integrationId}/releases/latest`);
}

// ── Builds ────────────────────────────────────────────────────────────────────

export interface BuildPayload {
  tag: string;
  integration_id: number;
}

export function createBuild(
  payload: BuildPayload,
  mode: "init" | "normal" = "normal"
): Promise<unknown> {
  return pandiumFetch<unknown>(`/v2/sourcecontrol/build?mode=${mode}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Tenants ───────────────────────────────────────────────────────────────────

export interface Tenant {
  id: number;
  name: string;
  archived: boolean;
  integration_id: number;
  paused: boolean;
  schedule: string;
  integration_release_id: number;
  integration_release_channel: string;
}

export function listTenants(params?: {
  integration_id?: number;
  limit?: number;
  skip?: number;
  archived?: boolean;
}): Promise<Tenant[]> {
  const qs = new URLSearchParams();
  if (params?.integration_id != null) qs.set("integration_id", String(params.integration_id));
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.skip != null) qs.set("skip", String(params.skip));
  if (params?.archived != null) qs.set("archived", String(params.archived));
  const query = qs.toString();
  return pandiumFetch<Tenant[]>(`/v2/tenants${query ? `?${query}` : ""}`);
}

export interface SyncResponse {
  trigger_id: string;
}

export function triggerSync(
  tenantId: number,
  mode: "init" | "normal" = "normal"
): Promise<SyncResponse> {
  return pandiumFetch<SyncResponse>(`/v2/tenants/${tenantId}/sync?mode=${mode}`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// ── Runs ──────────────────────────────────────────────────────────────────────

export interface RunStatus {
  status: string;
}

export function getRunStatus(triggerId: string): Promise<RunStatus> {
  return pandiumFetch<RunStatus>(`/v2/runs/triggers/${triggerId}/status`);
}
