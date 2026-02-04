import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RuntimeEnv } from "../runtime.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import { applyAuthChoice, resolvePreferredProviderForAuthChoice } from "./auth-choice.js";

const noopAsync = async () => {};
const noop = () => {};
const authProfilePathFor = (agentDir: string) => path.join(agentDir, "auth-profiles.json");
const requireAgentDir = () => {
  const agentDir = process.env.OPENCLAW_AGENT_DIR;
  if (!agentDir) {
    throw new Error("OPENCLAW_AGENT_DIR not set");
  }
  return agentDir;
};

const createPrompter = (textResponses: string[]): WizardPrompter => {
  const text = vi.fn().mockImplementation(async () => String(textResponses.shift() ?? ""));
  return {
    intro: vi.fn(noopAsync),
    outro: vi.fn(noopAsync),
    note: vi.fn(noopAsync),
    select: vi.fn(async () => "" as never),
    multiselect: vi.fn(async () => []),
    text,
    confirm: vi.fn(async () => false),
    progress: vi.fn(() => ({ update: noop, stop: noop })),
  };
};

const createRuntime = (): RuntimeEnv => ({
  log: vi.fn(),
  error: vi.fn(),
  exit: vi.fn((code: number) => {
    throw new Error(`exit:${code}`);
  }),
});

describe("applyAuthChoice", () => {
  const previousStateDir = process.env.OPENCLAW_STATE_DIR;
  const previousAgentDir = process.env.OPENCLAW_AGENT_DIR;
  const previousPiAgentDir = process.env.PI_CODING_AGENT_DIR;
  const previousMapleKey = process.env.MAPLE_API_KEY;
  const previousPrivatemodeKey = process.env.PRIVATEMODE_API_KEY;
  let tempStateDir: string | null = null;

  afterEach(async () => {
    vi.unstubAllGlobals();
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
    if (previousMapleKey === undefined) {
      delete process.env.MAPLE_API_KEY;
    } else {
      process.env.MAPLE_API_KEY = previousMapleKey;
    }
    if (previousPrivatemodeKey === undefined) {
      delete process.env.PRIVATEMODE_API_KEY;
    } else {
      process.env.PRIVATEMODE_API_KEY = previousPrivatemodeKey;
    }
  });

  it("writes Maple credentials when selecting maple-api-key", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-auth-"));
    process.env.OPENCLAW_STATE_DIR = tempStateDir;
    process.env.OPENCLAW_AGENT_DIR = path.join(tempStateDir, "agent");
    process.env.PI_CODING_AGENT_DIR = process.env.OPENCLAW_AGENT_DIR;

    const prompter = createPrompter(["sk-maple-test", ""]);
    const runtime = createRuntime();

    const result = await applyAuthChoice({
      authChoice: "maple-api-key",
      config: {},
      prompter,
      runtime,
      setDefaultModel: true,
    });

    expect(result.config.auth?.profiles?.["maple:default"]).toMatchObject({
      provider: "maple",
      mode: "api_key",
    });

    const authProfilePath = authProfilePathFor(requireAgentDir());
    const raw = await fs.readFile(authProfilePath, "utf8");
    const parsed = JSON.parse(raw) as {
      profiles?: Record<string, { key?: string }>;
    };
    expect(parsed.profiles?.["maple:default"]?.key).toBe("sk-maple-test");
  });

  it("writes Privatemode credentials when selecting privatemode-api-key", async () => {
    tempStateDir = await fs.mkdtemp(path.join(os.tmpdir(), "openclaw-auth-"));
    process.env.OPENCLAW_STATE_DIR = tempStateDir;
    process.env.OPENCLAW_AGENT_DIR = path.join(tempStateDir, "agent");
    process.env.PI_CODING_AGENT_DIR = process.env.OPENCLAW_AGENT_DIR;

    const prompter = createPrompter(["sk-privatemode-test", ""]);
    const runtime = createRuntime();

    const result = await applyAuthChoice({
      authChoice: "privatemode-api-key",
      config: {},
      prompter,
      runtime,
      setDefaultModel: true,
    });

    expect(result.config.auth?.profiles?.["privatemode:default"]).toMatchObject({
      provider: "privatemode",
      mode: "api_key",
    });

    const authProfilePath = authProfilePathFor(requireAgentDir());
    const raw = await fs.readFile(authProfilePath, "utf8");
    const parsed = JSON.parse(raw) as {
      profiles?: Record<string, { key?: string }>;
    };
    expect(parsed.profiles?.["privatemode:default"]?.key).toBe("sk-privatemode-test");
  });
});

describe("resolvePreferredProviderForAuthChoice", () => {
  it("maps maple-api-key to maple", () => {
    expect(resolvePreferredProviderForAuthChoice("maple-api-key")).toBe("maple");
  });

  it("maps privatemode-api-key to privatemode", () => {
    expect(resolvePreferredProviderForAuthChoice("privatemode-api-key")).toBe("privatemode");
  });
});
