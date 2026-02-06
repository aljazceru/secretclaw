import { createSubsystemLogger } from "../logging/subsystem.js";
import { parseBooleanValue } from "../utils/boolean.js";

const log = createSubsystemLogger("env");
const loggedEnv = new Set<string>();

type AcceptedEnvOption = {
  key: string;
  description: string;
  value?: string;
  redact?: boolean;
};

function formatEnvValue(value: string, redact?: boolean): string {
  if (redact) {
    return "<redacted>";
  }
  const singleLine = value.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 160) {
    return singleLine;
  }
  return `${singleLine.slice(0, 160)}…`;
}

export function logAcceptedEnvOption(option: AcceptedEnvOption): void {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return;
  }
  if (loggedEnv.has(option.key)) {
    return;
  }
  const rawValue = option.value ?? process.env[option.key];
  if (!rawValue || !rawValue.trim()) {
    return;
  }
  loggedEnv.add(option.key);
  log.info(`env: ${option.key}=${formatEnvValue(rawValue, option.redact)} (${option.description})`);
}

export function normalizeZaiEnv(): void {
  if (!process.env.ZAI_API_KEY?.trim() && process.env.Z_AI_API_KEY?.trim()) {
    process.env.ZAI_API_KEY = process.env.Z_AI_API_KEY;
  }
}

/**
 * Migrate legacy OPENCLAW_* env vars to SECRETCLAW_*.
 * If a SECRETCLAW_* var is not set but the corresponding OPENCLAW_* var is,
 * copy the value so the rest of the codebase only needs to check SECRETCLAW_*.
 */
function migrateOpenclawEnv(): void {
  const PREFIX_OLD = "OPENCLAW_";
  const PREFIX_NEW = "SECRETCLAW_";
  for (const key of Object.keys(process.env)) {
    if (!key.startsWith(PREFIX_OLD)) continue;
    const newKey = PREFIX_NEW + key.slice(PREFIX_OLD.length);
    if (!process.env[newKey]?.trim() && process.env[key]?.trim()) {
      process.env[newKey] = process.env[key];
    }
  }
}

export function isTruthyEnvValue(value?: string): boolean {
  return parseBooleanValue(value) === true;
}

export function normalizeEnv(): void {
  migrateOpenclawEnv();
  normalizeZaiEnv();
}
