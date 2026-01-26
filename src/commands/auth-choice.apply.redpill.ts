import { ensureAuthProfileStore, resolveAuthProfileOrder } from "../agents/auth-profiles.js";
import { resolveEnvApiKey } from "../agents/model-auth.js";
import { formatApiKeyPreview, normalizeApiKeyInput } from "./auth-choice.api-key.js";
import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { applyDefaultModelChoice } from "./auth-choice.default-model.js";
import { applyAuthProfileConfig } from "./onboard-auth.js";
import {
  applyRedpillConfig,
  applyRedpillProviderConfig,
  REDPILL_DEFAULT_MODEL_REF,
  setRedpillApiKey,
} from "./onboard-auth.redpill.js";

/**
 * Validate that an API key starts with the RedPill prefix "rp_".
 *
 * RedPill API keys must start with "rp_" to be valid.
 */
function validateRedpillApiKey(value: string): string | undefined {
  const normalized = normalizeApiKeyInput(value);
  if (!normalized) return "Required";
  if (!normalized.startsWith("rp_")) {
    return 'RedPill API keys must start with "rp_"';
  }
  return undefined;
}

/**
 * Apply RedPill API key authentication choice.
 *
 * This handler:
 * 1. Checks for existing credentials in auth profile store
 * 2. Checks for REDPILL_API_KEY environment variable
 * 3. Prompts user for API key if none found
 * 4. Validates API key format (must start with "rp_")
 * 5. Stores credentials in auth profile store
 * 6. Configures RedPill provider and sets default model
 *
 * @returns Updated config with RedPill authentication applied, or null if not a RedPill auth choice
 */
export async function applyAuthChoiceRedpill(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  if (params.authChoice !== "redpill-api-key") {
    return null;
  }

  let nextConfig = params.config;
  let agentModelOverride: string | undefined;

  const noteAgentModel = async (model: string) => {
    if (!params.agentId) return;
    await params.prompter.note(
      `Default model set to ${model} for agent "${params.agentId}".`,
      "Model configured",
    );
  };

  const store = ensureAuthProfileStore(params.agentDir, {
    allowKeychainPrompt: false,
  });
  const profileOrder = resolveAuthProfileOrder({
    cfg: nextConfig,
    store,
    provider: "redpill",
  });
  const existingProfileId = profileOrder.find((profileId) => Boolean(store.profiles[profileId]));
  const existingCred = existingProfileId ? store.profiles[existingProfileId] : undefined;
  let profileId = "redpill:default";
  let mode: "api_key" | "oauth" | "token" = "api_key";
  let hasCredential = false;

  if (existingProfileId && existingCred?.type) {
    profileId = existingProfileId;
    mode =
      existingCred.type === "oauth" ? "oauth" : existingCred.type === "token" ? "token" : "api_key";
    hasCredential = true;
  }

  if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "redpill") {
    await setRedpillApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
    hasCredential = true;
  }

  if (!hasCredential) {
    const envKey = resolveEnvApiKey("redpill");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing REDPILL_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setRedpillApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
  }

  if (!hasCredential) {
    await params.prompter.note(
      [
        "RedPill.ai provides TEE (Trusted Execution Environment) confidential inference.",
        "Models prefixed with 'phala/' run with cryptographic attestation.",
        "Get your API key at: https://redpill.ai/",
      ].join("\n"),
      "RedPill AI",
    );

    const key = await params.prompter.text({
      message: "Enter RedPill API key",
      validate: validateRedpillApiKey,
    });
    await setRedpillApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    hasCredential = true;
  }

  if (hasCredential) {
    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId,
      provider: "redpill",
      mode,
    });
  }

  {
    const applied = await applyDefaultModelChoice({
      config: nextConfig,
      setDefaultModel: params.setDefaultModel,
      defaultModel: REDPILL_DEFAULT_MODEL_REF,
      applyDefaultConfig: applyRedpillConfig,
      applyProviderConfig: applyRedpillProviderConfig,
      noteDefault: REDPILL_DEFAULT_MODEL_REF,
      noteAgentModel,
      prompter: params.prompter,
    });
    nextConfig = applied.config;
    agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
  }

  return { config: nextConfig, agentModelOverride };
}
