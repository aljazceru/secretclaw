import type { ApplyAuthChoiceParams, ApplyAuthChoiceResult } from "./auth-choice.apply.js";
import { resolveEnvApiKey } from "../agents/model-auth.js";
import {
  formatApiKeyPreview,
  normalizeApiKeyInput,
  validateApiKeyInput,
} from "./auth-choice.api-key.js";
import { applyDefaultModelChoice } from "./auth-choice.default-model.js";
import {
  applyAuthProfileConfig,
  applyMapleConfig,
  applyMapleProviderConfig,
  applyPrivatemodeConfig,
  applyPrivatemodeProviderConfig,
  PRIVATEMODE_DEFAULT_MODEL_REF,
  setPrivatemodeApiKey,
  MAPLE_DEFAULT_MODEL_REF,
  setMapleApiKey,
} from "./onboard-auth.js";

const MAPLE_DEFAULT_PROXY_URL = "http://127.0.0.1:8080/v1";
const PRIVATEMODE_DEFAULT_PROXY_URL = "http://127.0.0.1:8080/v1";

function isLocalProxyUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export async function applyAuthChoiceApiProviders(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult | null> {
  let nextConfig = params.config;
  let agentModelOverride: string | undefined;
  const noteAgentModel = async (model: string) => {
    if (!params.agentId) {
      return;
    }
    await params.prompter.note(
      `Default model set to ${model} for agent "${params.agentId}".`,
      "Model configured",
    );
  };

  const authChoice = params.authChoice;

  if (authChoice === "maple-api-key") {
    let hasCredential = false;
    let baseUrl: string | undefined;

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "maple") {
      await setMapleApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential) {
      await params.prompter.note(
        [
          "Maple AI provides TEE-based private inference with end-to-end encryption.",
          "Download the Maple desktop app at: https://trymaple.ai/downloads",
          "Run the app or Docker container, then configure the local proxy URL.",
          "Default URL: http://127.0.0.1:8080/v1",
          "MAPLE_API_KEY is required in production only; local proxy accepts any token.",
          "Maple supports streaming responses only.",
          "Generate your API key within the Maple app.",
        ].join("\n"),
        "Maple AI",
      );
    }

    const envKey = resolveEnvApiKey("maple");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing MAPLE_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setMapleApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Maple AI API key",
        validate: validateApiKeyInput,
      });
      await setMapleApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }

    const customUrl = await params.prompter.text({
      message: "Enter Maple proxy URL (press Enter for default)",
      placeholder: MAPLE_DEFAULT_PROXY_URL,
    });
    if (customUrl && String(customUrl).trim()) {
      const trimmed = String(customUrl).trim();
      if (isLocalProxyUrl(trimmed)) {
        baseUrl = trimmed;
      } else {
        await params.prompter.note(
          "Maple proxy must be local-only (use http://127.0.0.1:8080/v1).",
          "Maple AI",
        );
      }
    }

    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "maple:default",
      provider: "maple",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: MAPLE_DEFAULT_MODEL_REF,
        applyDefaultConfig: (config) => applyMapleConfig(config, { baseUrl }),
        applyProviderConfig: (config) => applyMapleProviderConfig(config, { baseUrl }),
        noteDefault: MAPLE_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  if (authChoice === "privatemode-api-key") {
    let hasCredential = false;
    let baseUrl: string | undefined;

    if (!hasCredential && params.opts?.token && params.opts?.tokenProvider === "privatemode") {
      await setPrivatemodeApiKey(normalizeApiKeyInput(params.opts.token), params.agentDir);
      hasCredential = true;
    }

    if (!hasCredential) {
      await params.prompter.note(
        [
          "Privatemode provides attestation-enforcing proxy for TEE-verified inference.",
          "Deploy the proxy: docker run -p 8080:8080 ghcr.io/edgelesssys/privatemode/privatemode-proxy:latest",
          "Configure the proxy with your API key, then point SecretClaw at the local endpoint.",
          "Default URL: http://127.0.0.1:8080/v1",
          "PRIVATEMODE_API_KEY is optional for local proxy; required in production.",
          "The proxy verifies attestation and encrypts all traffic end-to-end.",
        ].join("\n"),
        "Privatemode",
      );
    }

    const envKey = resolveEnvApiKey("privatemode");
    if (envKey) {
      const useExisting = await params.prompter.confirm({
        message: `Use existing PRIVATEMODE_API_KEY (${envKey.source}, ${formatApiKeyPreview(envKey.apiKey)})?`,
        initialValue: true,
      });
      if (useExisting) {
        await setPrivatemodeApiKey(envKey.apiKey, params.agentDir);
        hasCredential = true;
      }
    }
    if (!hasCredential) {
      const key = await params.prompter.text({
        message: "Enter Privatemode API key (optional for local proxy)",
        validate: validateApiKeyInput,
      });
      await setPrivatemodeApiKey(normalizeApiKeyInput(String(key)), params.agentDir);
    }

    const customUrl = await params.prompter.text({
      message: "Enter Privatemode proxy URL (press Enter for default)",
      placeholder: PRIVATEMODE_DEFAULT_PROXY_URL,
    });
    if (customUrl && String(customUrl).trim()) {
      const trimmed = String(customUrl).trim();
      if (isLocalProxyUrl(trimmed)) {
        baseUrl = trimmed;
      } else {
        await params.prompter.note(
          "Privatemode proxy must be local-only (use http://127.0.0.1:8080/v1).",
          "Privatemode",
        );
      }
    }

    nextConfig = applyAuthProfileConfig(nextConfig, {
      profileId: "privatemode:default",
      provider: "privatemode",
      mode: "api_key",
    });
    {
      const applied = await applyDefaultModelChoice({
        config: nextConfig,
        setDefaultModel: params.setDefaultModel,
        defaultModel: PRIVATEMODE_DEFAULT_MODEL_REF,
        applyDefaultConfig: (config) => applyPrivatemodeConfig(config, { baseUrl }),
        applyProviderConfig: (config) => applyPrivatemodeProviderConfig(config, { baseUrl }),
        noteDefault: PRIVATEMODE_DEFAULT_MODEL_REF,
        noteAgentModel,
        prompter: params.prompter,
      });
      nextConfig = applied.config;
      agentModelOverride = applied.agentModelOverride ?? agentModelOverride;
    }
    return { config: nextConfig, agentModelOverride };
  }

  return null;
}
