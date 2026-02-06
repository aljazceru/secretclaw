import type { SecretClawConfig } from "../config/config.js";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import type { AuthChoice } from "./onboard-types.js";
import { applyAuthChoiceApiProviders } from "./auth-choice.apply.api-providers.js";

export type ApplyAuthChoiceParams = {
  authChoice: AuthChoice;
  config: SecretClawConfig;
  prompter: WizardPrompter;
  runtime: RuntimeEnv;
  agentDir?: string;
  setDefaultModel: boolean;
  agentId?: string;
  opts?: {
    tokenProvider?: string;
    token?: string;
  };
};

export type ApplyAuthChoiceResult = {
  config: SecretClawConfig;
  agentModelOverride?: string;
};

export async function applyAuthChoice(
  params: ApplyAuthChoiceParams,
): Promise<ApplyAuthChoiceResult> {
  return (await applyAuthChoiceApiProviders(params)) ?? { config: params.config };
}
