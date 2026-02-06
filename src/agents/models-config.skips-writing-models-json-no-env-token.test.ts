import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SecretClawConfig } from "../config/config.js";
import { withTempHome as withTempHomeBase } from "../../test/helpers/temp-home.js";

async function withTempHome<T>(fn: (home: string) => Promise<T>): Promise<T> {
  return withTempHomeBase(fn, { prefix: "secretclaw-models-" });
}

const MODELS_CONFIG: SecretClawConfig = {
  models: {
    providers: {
      "custom-proxy": {
        baseUrl: "http://localhost:4000/v1",
        apiKey: "TEST_KEY",
        api: "openai-completions",
        models: [
          {
            id: "llama-3.1-8b",
            name: "Llama 3.1 8B (Proxy)",
            api: "openai-completions",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 32000,
          },
        ],
      },
    },
  },
};

describe("models-config", () => {
  let previousHome: string | undefined;

  beforeEach(() => {
    previousHome = process.env.HOME;
  });

  afterEach(() => {
    process.env.HOME = previousHome;
  });

  it("writes models.json even when no env token or profile exists (TEE defaults)", async () => {
    await withTempHome(async (home) => {
      const previousMaple = process.env.MAPLE_API_KEY;
      const previousPrivatemode = process.env.PRIVATEMODE_API_KEY;
      delete process.env.MAPLE_API_KEY;
      delete process.env.PRIVATEMODE_API_KEY;

      try {
        vi.resetModules();
        const { ensureSecretClawModelsJson } = await import("./models-config.js");

        const agentDir = path.join(home, "agent-empty");
        const result = await ensureSecretClawModelsJson(
          {
            models: { providers: {} },
          },
          agentDir,
        );

        const raw = await fs.readFile(path.join(agentDir, "models.json"), "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<string, { baseUrl?: string }>;
        };
        expect(parsed.providers.maple).toBeDefined();
        expect(parsed.providers.privatemode).toBeDefined();
        expect(result.wrote).toBe(true);
      } finally {
        if (previousMaple === undefined) {
          delete process.env.MAPLE_API_KEY;
        } else {
          process.env.MAPLE_API_KEY = previousMaple;
        }
        if (previousPrivatemode === undefined) {
          delete process.env.PRIVATEMODE_API_KEY;
        } else {
          process.env.PRIVATEMODE_API_KEY = previousPrivatemode;
        }
      }
    });
  });
  it("writes models.json for configured providers", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const { ensureSecretClawModelsJson } = await import("./models-config.js");
      const { resolveSecretClawAgentDir } = await import("./agent-paths.js");

      await ensureSecretClawModelsJson(MODELS_CONFIG);

      const modelPath = path.join(resolveSecretClawAgentDir(), "models.json");
      const raw = await fs.readFile(modelPath, "utf8");
      const parsed = JSON.parse(raw) as {
        providers: Record<string, { baseUrl?: string }>;
      };

      expect(parsed.providers["custom-proxy"]?.baseUrl).toBe("http://localhost:4000/v1");
    });
  });
  it("adds maple provider when MAPLE_API_KEY is set", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const prevKey = process.env.MAPLE_API_KEY;
      process.env.MAPLE_API_KEY = "sk-maple-test";
      try {
        const { ensureSecretClawModelsJson } = await import("./models-config.js");
        const { resolveSecretClawAgentDir } = await import("./agent-paths.js");

        await ensureSecretClawModelsJson({});

        const modelPath = path.join(resolveSecretClawAgentDir(), "models.json");
        const raw = await fs.readFile(modelPath, "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<
            string,
            {
              baseUrl?: string;
              apiKey?: string;
              models?: Array<{ id: string }>;
            }
          >;
        };
        expect(parsed.providers.maple?.baseUrl).toBe("http://127.0.0.1:8080/v1");
        expect(parsed.providers.maple?.apiKey).toBe("MAPLE_API_KEY");
        const ids = parsed.providers.maple?.models?.map((model) => model.id);
        expect(ids).toContain("kimi-k2-5");
      } finally {
        if (prevKey === undefined) {
          delete process.env.MAPLE_API_KEY;
        } else {
          process.env.MAPLE_API_KEY = prevKey;
        }
      }
    });
  });
  it("adds privatemode provider when PRIVATEMODE_API_KEY is set", async () => {
    await withTempHome(async () => {
      vi.resetModules();
      const prevKey = process.env.PRIVATEMODE_API_KEY;
      process.env.PRIVATEMODE_API_KEY = "sk-privatemode-test";
      try {
        const { ensureSecretClawModelsJson } = await import("./models-config.js");
        const { resolveSecretClawAgentDir } = await import("./agent-paths.js");

        await ensureSecretClawModelsJson({});

        const modelPath = path.join(resolveSecretClawAgentDir(), "models.json");
        const raw = await fs.readFile(modelPath, "utf8");
        const parsed = JSON.parse(raw) as {
          providers: Record<
            string,
            {
              baseUrl?: string;
              apiKey?: string;
              models?: Array<{ id: string }>;
            }
          >;
        };
        expect(parsed.providers.privatemode?.baseUrl).toBe("http://127.0.0.1:8080/v1");
        expect(parsed.providers.privatemode?.apiKey).toBe("PRIVATEMODE_API_KEY");
        const ids = parsed.providers.privatemode?.models?.map((model) => model.id);
        expect(ids).toContain("llama-3.3-70b");
      } finally {
        if (prevKey === undefined) {
          delete process.env.PRIVATEMODE_API_KEY;
        } else {
          process.env.PRIVATEMODE_API_KEY = prevKey;
        }
      }
    });
  });
});
