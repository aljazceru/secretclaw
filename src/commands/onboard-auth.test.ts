import type { OAuthCredentials } from "@mariozechner/pi-ai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyAuthProfileConfig,
  applyMapleConfig,
  applyMapleProviderConfig,
  applyPrivatemodeConfig,
  applyPrivatemodeProviderConfig,
  MAPLE_DEFAULT_MODEL_REF,
  PRIVATEMODE_DEFAULT_MODEL_REF,
  setMapleApiKey,
  setPrivatemodeApiKey,
  writeOAuthCredentials,
} from "./onboard-auth.js";

const authProfilePathFor = (agentDir: string) => path.join(agentDir, "auth-profiles.json");
const requireAgentDir = () => {
  const agentDir = process.env.OPENCLAW_AGENT_DIR;
  if (!agentDir) {
    throw new Error("OPENCLAW_AGENT_DIR not set");
  }
  return agentDir;
};

describe("writeOAuthCredentials", () => {
  const previousStateDir = process.env.OPENCLAW_STATE_DIR;
  const previousAgentDir = process.env.OPENCLAW_AGENT_DIR;
  const previousPiAgentDir = process.env.PI_CODING_AGENT_DIR;
  let tempStateDir: string | null = null;

  afterEach(async () => {
    if (tempStateDir) {
      await fs.rm(tempStateDir, { recursive: true, force: true });
      tempStateDir = null;
    }
    if (previousStateDir === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = previousStateDir;
    }
    if (previousAgentDir === undefined) {
      delete process.env.OPENCLAW_AGENT_DIR;
    } else {
      process.env.OPENCLAW_AGENT_DIR = previousAgentDir;
    }
    if (previousPiAgentDir === undefined) {
      delete process.env.PI_CODING_AGENT_DIR;
    } else {
      process.env.PI_CODING_AGENT_DIR = previousPiAgentDir;
    }
    delete process.env.OPENCLAW_OAUTH_DIR;
  });

  it("writes auth-profiles.json under OPENCLAW_AGENT_DIR when set", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-oauth-"));
    process.env.OPENCLAW_STATE_DIR = tempStateDir;
    process.env.OPENCLAW_AGENT_DIR = path.join(tempStateDir, "agent");
    process.env.PI_CODING_AGENT_DIR = process.env.OPENCLAW_AGENT_DIR;

    const creds = {
      refresh: "refresh-token",
      access: "access-token",
      expires: Date.now() + 60_000,
    } satisfies OAuthCredentials;

    await writeOAuthCredentials("tee-oauth", creds);

    const authProfilePath = authProfilePathFor(requireAgentDir());
    const raw = await fs.readFile(authProfilePath, "utf8");
    const parsed = JSON.parse(raw) as {
      profiles?: Record<string, OAuthCredentials & { type?: string }>;
    };
    expect(parsed.profiles?.["tee-oauth:default"]).toMatchObject({
      refresh: "refresh-token",
      access: "access-token",
      type: "oauth",
    });
  });
});

describe("setMapleApiKey", () => {
  const previousStateDir = process.env.OPENCLAW_STATE_DIR;
  const previousAgentDir = process.env.OPENCLAW_AGENT_DIR;
  const previousPiAgentDir = process.env.PI_CODING_AGENT_DIR;
  let tempStateDir: string | null = null;

  afterEach(async () => {
    if (tempStateDir) {
      await fs.rm(tempStateDir, { recursive: true, force: true });
      tempStateDir = null;
    }
    if (previousStateDir === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = previousStateDir;
    }
    if (previousAgentDir === undefined) {
      delete process.env.OPENCLAW_AGENT_DIR;
    } else {
      process.env.OPENCLAW_AGENT_DIR = previousAgentDir;
    }
    if (previousPiAgentDir === undefined) {
      delete process.env.PI_CODING_AGENT_DIR;
    } else {
      process.env.PI_CODING_AGENT_DIR = previousPiAgentDir;
    }
  });

  it("writes to OPENCLAW_AGENT_DIR when set", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-maple-"));
    process.env.OPENCLAW_STATE_DIR = tempStateDir;
    process.env.OPENCLAW_AGENT_DIR = path.join(tempStateDir, "custom-agent");
    process.env.PI_CODING_AGENT_DIR = process.env.OPENCLAW_AGENT_DIR;

    await setMapleApiKey("sk-maple-test");

    const customAuthPath = authProfilePathFor(requireAgentDir());
    const raw = await fs.readFile(customAuthPath, "utf8");
    const parsed = JSON.parse(raw) as {
      profiles?: Record<string, { type?: string; provider?: string; key?: string }>;
    };
    expect(parsed.profiles?.["maple:default"]).toMatchObject({
      type: "api_key",
      provider: "maple",
      key: "sk-maple-test",
    });
  });
});

describe("setPrivatemodeApiKey", () => {
  const previousStateDir = process.env.OPENCLAW_STATE_DIR;
  const previousAgentDir = process.env.OPENCLAW_AGENT_DIR;
  const previousPiAgentDir = process.env.PI_CODING_AGENT_DIR;
  let tempStateDir: string | null = null;

  afterEach(async () => {
    if (tempStateDir) {
      await fs.rm(tempStateDir, { recursive: true, force: true });
      tempStateDir = null;
    }
    if (previousStateDir === undefined) {
      delete process.env.OPENCLAW_STATE_DIR;
    } else {
      process.env.OPENCLAW_STATE_DIR = previousStateDir;
    }
    if (previousAgentDir === undefined) {
      delete process.env.OPENCLAW_AGENT_DIR;
    } else {
      process.env.OPENCLAW_AGENT_DIR = previousAgentDir;
    }
    if (previousPiAgentDir === undefined) {
      delete process.env.PI_CODING_AGENT_DIR;
    } else {
      process.env.PI_CODING_AGENT_DIR = previousPiAgentDir;
    }
  });

  it("writes to OPENCLAW_AGENT_DIR when set", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-privatemode-"));
    process.env.OPENCLAW_STATE_DIR = tempStateDir;
    process.env.OPENCLAW_AGENT_DIR = path.join(tempStateDir, "custom-agent");
    process.env.PI_CODING_AGENT_DIR = process.env.OPENCLAW_AGENT_DIR;

    await setPrivatemodeApiKey("sk-privatemode-test");

    const customAuthPath = authProfilePathFor(requireAgentDir());
    const raw = await fs.readFile(customAuthPath, "utf8");
    const parsed = JSON.parse(raw) as {
      profiles?: Record<string, { type?: string; provider?: string; key?: string }>;
    };
    expect(parsed.profiles?.["privatemode:default"]).toMatchObject({
      type: "api_key",
      provider: "privatemode",
      key: "sk-privatemode-test",
    });
  });
});

describe("applyAuthProfileConfig", () => {
  it("promotes the newly selected profile to the front of auth.order", () => {
    const next = applyAuthProfileConfig(
      {
        auth: {
          profiles: {
            "maple:default": { provider: "maple", mode: "api_key" },
          },
          order: { maple: ["maple:default"] },
        },
      },
      {
        profileId: "maple:work",
        provider: "maple",
        mode: "oauth",
      },
    );

    expect(next.auth?.order?.maple).toEqual(["maple:work", "maple:default"]);
  });
});

describe("applyMapleConfig", () => {
  it("sets Maple as the default model", () => {
    const cfg = applyMapleConfig({});
    expect(cfg.agents?.defaults?.model?.primary).toBe(MAPLE_DEFAULT_MODEL_REF);
    expect(cfg.models?.providers?.maple?.api).toBe("openai-completions");
  });

  it("preserves existing model fallbacks", () => {
    const cfg = applyMapleConfig({
      agents: {
        defaults: {
          model: { fallbacks: ["maple/qwen3-vl-30b"] },
        },
      },
    });
    expect(cfg.agents?.defaults?.model?.fallbacks).toEqual(["maple/qwen3-vl-30b"]);
  });
});

describe("applyMapleProviderConfig", () => {
  it("does not override existing primary model", () => {
    const cfg = applyMapleProviderConfig({
      agents: { defaults: { model: { primary: "privatemode/llama-3.3-70b" } } },
    });
    expect(cfg.agents?.defaults?.model?.primary).toBe("privatemode/llama-3.3-70b");
  });
});

describe("applyPrivatemodeConfig", () => {
  it("sets Privatemode as the default model", () => {
    const cfg = applyPrivatemodeConfig({});
    expect(cfg.agents?.defaults?.model?.primary).toBe(PRIVATEMODE_DEFAULT_MODEL_REF);
    expect(cfg.models?.providers?.privatemode?.api).toBe("openai-completions");
  });

  it("preserves existing model fallbacks", () => {
    const cfg = applyPrivatemodeConfig({
      agents: {
        defaults: {
          model: { fallbacks: ["maple/kimi-k2-5"] },
        },
      },
    });
    expect(cfg.agents?.defaults?.model?.fallbacks).toEqual(["maple/kimi-k2-5"]);
  });
});

describe("applyPrivatemodeProviderConfig", () => {
  it("does not override existing primary model", () => {
    const cfg = applyPrivatemodeProviderConfig({
      agents: { defaults: { model: { primary: "maple/kimi-k2-5" } } },
    });
    expect(cfg.agents?.defaults?.model?.primary).toBe("maple/kimi-k2-5");
  });
});
