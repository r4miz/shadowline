import type { RawDiscoveredApp } from "./classify";

export type ConnectorProvider = "google" | "microsoft" | "demo";

export interface WorkspaceUser {
  id: string;
  email: string;
  createdAt: string | null;
  suspended: boolean;
}

export interface BuiltInAiUsage {
  product: string;
  activeUsers: number;
  periodDays: number;
}

export interface ConnectorResult {
  apps: RawDiscoveredApp[];
  users: WorkspaceUser[];
  builtInAi: BuiltInAiUsage | null;
  /** Non-fatal problems worth surfacing to the operator. */
  warnings: string[];
}

/** Decrypted credential payloads, per provider. Never logged, never serialised to the client. */
export type GoogleCredentials = { kind: "google"; refreshToken: string };
export type MicrosoftCredentials = { kind: "microsoft"; tenantId: string };
export type DemoCredentials = { kind: "demo"; seed: string };
export type ConnectorCredentials = GoogleCredentials | MicrosoftCredentials | DemoCredentials;

export class ConnectorError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
  }
}
