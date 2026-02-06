import type { OAuthCredentials } from "@mariozechner/pi-ai";
import { resolveSecretClawAgentDir } from "../agents/agent-paths.js";
import { upsertAuthProfile } from "../agents/auth-profiles.js";

const resolveAuthAgentDir = (agentDir?: string) => agentDir ?? resolveSecretClawAgentDir();

export async function writeOAuthCredentials(
  provider: string,
  creds: OAuthCredentials,
  agentDir?: string,
): Promise<void> {
  const email =
    typeof creds.email === "string" && creds.email.trim() ? creds.email.trim() : "default";
  upsertAuthProfile({
    profileId: `${provider}:${email}`,
    credential: {
      type: "oauth",
      provider,
      ...creds,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setMapleApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "maple:default",
    credential: {
      type: "api_key",
      provider: "maple",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}

export async function setPrivatemodeApiKey(key: string, agentDir?: string) {
  // Write to resolved agent dir so gateway finds credentials on startup.
  upsertAuthProfile({
    profileId: "privatemode:default",
    credential: {
      type: "api_key",
      provider: "privatemode",
      key,
    },
    agentDir: resolveAuthAgentDir(agentDir),
  });
}
