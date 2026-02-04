import type { OpenClawConfig } from "../../../config/config.js";
import type { RuntimeEnv } from "../../../runtime.js";
import type { AuthChoice, OnboardOptions } from "../../onboard-types.js";

export async function applyNonInteractiveAuthChoice(params: {
  nextConfig: OpenClawConfig;
  authChoice: AuthChoice;
  opts: OnboardOptions;
  runtime: RuntimeEnv;
  baseConfig: OpenClawConfig;
}): Promise<OpenClawConfig | null> {
  const { authChoice, runtime } = params;
  let nextConfig = params.nextConfig;

  if (authChoice === "maple-api-key" || authChoice === "privatemode-api-key") {
    runtime.error("Auth choice requires interactive mode.");
    runtime.exit(1);
    return null;
  }

  return nextConfig;
}
