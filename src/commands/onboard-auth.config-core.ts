import type { OpenClawConfig } from "../config/config.js";
import {
  buildMapleModelDefinition,
  MAPLE_DEFAULT_BASE_URL,
  MAPLE_DEFAULT_MODEL_REF,
  MAPLE_MODEL_CATALOG,
} from "../agents/maple-models.js";
import {
  buildPrivatemodeModelDefinition,
  PRIVATEMODE_DEFAULT_BASE_URL,
  PRIVATEMODE_DEFAULT_MODEL_REF,
  PRIVATEMODE_MODEL_CATALOG,
} from "../agents/privatemode-models.js";

function resolveProxyBaseUrl(envVar: string, fallback: string): string {
  const value = process.env[envVar];
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || fallback;
}

function resolveMapleBaseUrl(): string {
  return resolveProxyBaseUrl("MAPLE_PROXY_URL", MAPLE_DEFAULT_BASE_URL);
}

function resolvePrivatemodeBaseUrl(): string {
  return resolveProxyBaseUrl("PRIVATEMODE_PROXY_URL", PRIVATEMODE_DEFAULT_BASE_URL);
}

/**
 * Apply Maple provider configuration without changing the default model.
 * Registers Maple models and sets up the provider, but preserves existing model selection.
 */
export function applyMapleProviderConfig(
  cfg: OpenClawConfig,
  params?: { baseUrl?: string },
): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[MAPLE_DEFAULT_MODEL_REF] = {
    ...models[MAPLE_DEFAULT_MODEL_REF],
    alias: models[MAPLE_DEFAULT_MODEL_REF]?.alias ?? "Kimi K2.5",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.maple;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const mapleModels = MAPLE_MODEL_CATALOG.map(buildMapleModelDefinition);
  const mergedModels = [
    ...existingModels,
    ...mapleModels.filter((model) => !existingModels.some((existing) => existing.id === model.id)),
  ];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  const baseUrl = params?.baseUrl ?? resolveMapleBaseUrl();
  providers.maple = {
    ...existingProviderRest,
    baseUrl,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : mapleModels,
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

/**
 * Apply Maple provider configuration AND set Maple as the default model.
 * Use this when Maple is the primary provider choice during onboarding.
 */
export function applyMapleConfig(
  cfg: OpenClawConfig,
  params?: { baseUrl?: string },
): OpenClawConfig {
  const next = applyMapleProviderConfig(cfg, params);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: MAPLE_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

/**
 * Apply Privatemode provider configuration without changing the default model.
 * Registers Privatemode models and sets up the provider, but preserves existing model selection.
 */
export function applyPrivatemodeProviderConfig(
  cfg: OpenClawConfig,
  params?: { baseUrl?: string },
): OpenClawConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[PRIVATEMODE_DEFAULT_MODEL_REF] = {
    ...models[PRIVATEMODE_DEFAULT_MODEL_REF],
    alias: models[PRIVATEMODE_DEFAULT_MODEL_REF]?.alias ?? "Llama 3.3 70B",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.privatemode;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const privatemodeModels = PRIVATEMODE_MODEL_CATALOG.map(buildPrivatemodeModelDefinition);
  const mergedModels = [
    ...existingModels,
    ...privatemodeModels.filter(
      (model) => !existingModels.some((existing) => existing.id === model.id),
    ),
  ];
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  const baseUrl = params?.baseUrl ?? resolvePrivatemodeBaseUrl();
  providers.privatemode = {
    ...existingProviderRest,
    baseUrl,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : privatemodeModels,
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

/**
 * Apply Privatemode provider configuration AND set Privatemode as the default model.
 * Use this when Privatemode is the primary provider choice during onboarding.
 */
export function applyPrivatemodeConfig(
  cfg: OpenClawConfig,
  params?: { baseUrl?: string },
): OpenClawConfig {
  const next = applyPrivatemodeProviderConfig(cfg, params);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: PRIVATEMODE_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

export function applyAuthProfileConfig(
  cfg: OpenClawConfig,
  params: {
    profileId: string;
    provider: string;
    mode: "api_key" | "oauth" | "token";
    email?: string;
    preferProfileFirst?: boolean;
  },
): OpenClawConfig {
  const profiles = {
    ...cfg.auth?.profiles,
    [params.profileId]: {
      provider: params.provider,
      mode: params.mode,
      ...(params.email ? { email: params.email } : {}),
    },
  };

  // Only maintain `auth.order` when the user explicitly configured it.
  // Default behavior: no explicit order -> resolveAuthProfileOrder can round-robin by lastUsed.
  const existingProviderOrder = cfg.auth?.order?.[params.provider];
  const preferProfileFirst = params.preferProfileFirst ?? true;
  const reorderedProviderOrder =
    existingProviderOrder && preferProfileFirst
      ? [
          params.profileId,
          ...existingProviderOrder.filter((profileId) => profileId !== params.profileId),
        ]
      : existingProviderOrder;
  const order =
    existingProviderOrder !== undefined
      ? {
          ...cfg.auth?.order,
          [params.provider]: reorderedProviderOrder?.includes(params.profileId)
            ? reorderedProviderOrder
            : [...(reorderedProviderOrder ?? []), params.profileId],
        }
      : cfg.auth?.order;
  return {
    ...cfg,
    auth: {
      ...cfg.auth,
      profiles,
      ...(order ? { order } : {}),
    },
  };
}
