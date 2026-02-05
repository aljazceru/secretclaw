import type { Api, Model } from "@mariozechner/pi-ai";
import { isIP } from "node:net";
import type { OpenClawConfig } from "../../config/config.js";
import type { ModelDefinitionConfig } from "../../config/types.js";
import { resolveOpenClawAgentDir } from "../agent-paths.js";
import { DEFAULT_CONTEXT_TOKENS } from "../defaults.js";
import { normalizeModelCompat } from "../model-compat.js";
import { normalizeProviderId } from "../model-selection.js";
import {
  discoverAuthStorage,
  discoverModels,
  type AuthStorage,
  type ModelRegistry,
} from "../pi-model-discovery.js";

type InlineModelEntry = ModelDefinitionConfig & { provider: string; baseUrl?: string };
type InlineProviderConfig = {
  baseUrl?: string;
  api?: ModelDefinitionConfig["api"];
  models?: ModelDefinitionConfig[];
};

export function buildInlineProviderModels(
  providers: Record<string, InlineProviderConfig>,
): InlineModelEntry[] {
  return Object.entries(providers).flatMap(([providerId, entry]) => {
    const trimmed = providerId.trim();
    if (!trimmed) {
      return [];
    }
    return (entry?.models ?? []).map((model) => ({
      ...model,
      provider: trimmed,
      baseUrl: entry?.baseUrl,
      api: model.api ?? entry?.api,
    }));
  });
}

export function buildModelAliasLines(cfg?: OpenClawConfig) {
  const models = cfg?.agents?.defaults?.models ?? {};
  const entries: Array<{ alias: string; model: string }> = [];
  for (const [keyRaw, entryRaw] of Object.entries(models)) {
    const model = String(keyRaw ?? "").trim();
    if (!model) {
      continue;
    }
    const alias = String((entryRaw as { alias?: string } | undefined)?.alias ?? "").trim();
    if (!alias) {
      continue;
    }
    entries.push({ alias, model });
  }
  return entries
    .toSorted((a, b) => a.alias.localeCompare(b.alias))
    .map((entry) => `- ${entry.alias}: ${entry.model}`);
}

export function resolveModel(
  provider: string,
  modelId: string,
  agentDir?: string,
  cfg?: OpenClawConfig,
): {
  model?: Model<Api>;
  error?: string;
  authStorage: AuthStorage;
  modelRegistry: ModelRegistry;
} {
  const resolvedAgentDir = agentDir ?? resolveOpenClawAgentDir();
  const authStorage = discoverAuthStorage(resolvedAgentDir);
  const modelRegistry = discoverModels(authStorage, resolvedAgentDir);
  const model = modelRegistry.find(provider, modelId) as Model<Api> | null;
  if (!model) {
    const providers = cfg?.models?.providers ?? {};
    const inlineModels = buildInlineProviderModels(providers);
    const normalizedProvider = normalizeProviderId(provider);
    const inlineMatch = inlineModels.find(
      (entry) => normalizeProviderId(entry.provider) === normalizedProvider && entry.id === modelId,
    );
    if (inlineMatch) {
      const normalized = normalizeModelCompat(inlineMatch as Model<Api>);
      const mapleError = validateMapleProxy(normalized);
      if (mapleError) {
        return { error: mapleError, authStorage, modelRegistry };
      }
      return { model: normalized, authStorage, modelRegistry };
    }
    const providerCfg = providers[provider];
    if (providerCfg || modelId.startsWith("mock-")) {
      const fallbackModel: Model<Api> = normalizeModelCompat({
        id: modelId,
        name: modelId,
        api: providerCfg?.api ?? "openai-responses",
        provider,
        baseUrl: providerCfg?.baseUrl,
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: providerCfg?.models?.[0]?.contextWindow ?? DEFAULT_CONTEXT_TOKENS,
        maxTokens: providerCfg?.models?.[0]?.maxTokens ?? DEFAULT_CONTEXT_TOKENS,
      } as Model<Api>);
      const mapleError = validateMapleProxy(fallbackModel);
      if (mapleError) {
        return { error: mapleError, authStorage, modelRegistry };
      }
      return { model: fallbackModel, authStorage, modelRegistry };
    }
    return {
      error: `Unknown model: ${provider}/${modelId}`,
      authStorage,
      modelRegistry,
    };
  }
  const normalized = normalizeModelCompat(model);
  const mapleError = validateMapleProxy(normalized);
  if (mapleError) {
    return { error: mapleError, authStorage, modelRegistry };
  }
  return { model: normalized, authStorage, modelRegistry };
}

const DEFAULT_LOCAL_PROXY_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "host.docker.internal",
  "host.containers.internal",
  "maple-proxy",
  "privatemode-proxy",
  "tinfoil-proxy",
]);

function resolveLocalProxyHosts(): Set<string> {
  const extra = process.env.OPENCLAW_LOCAL_PROXY_HOSTS;
  if (!extra?.trim()) {
    return DEFAULT_LOCAL_PROXY_HOSTS;
  }
  const hosts = new Set(DEFAULT_LOCAL_PROXY_HOSTS);
  for (const entry of extra.split(",")) {
    const trimmed = entry.trim().toLowerCase();
    if (trimmed) {
      hosts.add(trimmed);
    }
  }
  return hosts;
}

function isPrivateIp(host: string): boolean {
  const ipType = isIP(host);
  if (ipType === 4) {
    const [a, b] = host.split(".").map((part) => Number(part));
    if (a === 10 || a === 127) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    return false;
  }
  if (ipType === 6) {
    const normalized = host.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fe80")
    );
  }
  return false;
}

function isLocalProxyUrl(baseUrl?: string): boolean {
  if (!baseUrl) {
    return false;
  }
  try {
    const parsed = new URL(baseUrl);
    const host = parsed.hostname.toLowerCase();
    if (resolveLocalProxyHosts().has(host)) {
      return true;
    }
    return isPrivateIp(host);
  } catch {
    return false;
  }
}

function validateMapleProxy(model: Model<Api>): string | null {
  const provider = normalizeProviderId(model.provider);
  if (provider !== "maple") {
    return null;
  }
  if (!isLocalProxyUrl(model.baseUrl)) {
    return 'Maple proxy must be local-only (use "http://127.0.0.1:8080/v1").';
  }
  return null;
}
