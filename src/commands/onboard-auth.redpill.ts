import { upsertAuthProfile } from "../agents/auth-profiles.js";
import { resolveClawdbotAgentDir } from "../agents/agent-paths.js";
import type { ClawdbotConfig } from "../config/config.js";
import {
  REDPILL_BASE_URL,
  REDPILL_DEFAULT_MODEL_REF,
  buildRedpillModelDefinition,
  REDPILL_MODEL_CATALOG,
} from "../agents/models-config.providers.redpill.js";

const resolveAuthAgentDir = (agentDir?: string) => agentDir ?? resolveClawdbotAgentDir();

export { REDPILL_DEFAULT_MODEL_REF };

/**
 * Store RedPill API key in the auth profile store.
 *
 * RedPill API keys start with "rp_" and are stored in the auth-profiles.json
 * file under the "redpill:default" profile ID.
 */
export async function setRedpillApiKey(apiKey: string, agentDir?: string): Promise<void> {
  upsertAuthProfile({
    profileId: "redpill:default",
    credential: {
      type: "api_key",
      provider: "redpill",
      key: apiKey,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

/**
 * Apply RedPill provider configuration AND set RedPill as the default model.
 * Use this when RedPill is the primary provider choice during onboarding.
 */
export function applyRedpillConfig(
  cfg: ClawdbotConfig,
  profileId: string = "redpill:default",
): ClawdbotConfig {
  const next = applyRedpillProviderConfig(cfg, profileId);
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
          primary: REDPILL_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}

/**
 * Apply RedPill provider configuration without changing the default model.
 * Registers RedPill models and sets up the provider, but preserves existing model selection.
 */
export function applyRedpillProviderConfig(
  cfg: ClawdbotConfig,
  _profileId: string = "redpill:default",
): ClawdbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[REDPILL_DEFAULT_MODEL_REF] = {
    ...models[REDPILL_DEFAULT_MODEL_REF],
    alias: models[REDPILL_DEFAULT_MODEL_REF]?.alias ?? "DeepSeek V3 TEE",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.redpill;
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const redpillModels = REDPILL_MODEL_CATALOG.map(buildRedpillModelDefinition);
  const mergedModels = [
    ...existingModels,
    ...redpillModels.filter(
      (model) => !existingModels.some((existing) => existing.id === model.id),
    ),
  ];

  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();

  providers.redpill = {
    ...existingProviderRest,
    baseUrl: REDPILL_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : redpillModels,
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
