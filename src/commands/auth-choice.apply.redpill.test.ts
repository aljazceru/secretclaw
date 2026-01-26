import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { applyAuthChoiceRedpill } from "./auth-choice.apply.redpill.js";
import type { ApplyAuthChoiceParams } from "./auth-choice.apply.js";
import { REDPILL_DEFAULT_MODEL_REF } from "./onboard-auth.redpill.js";
import type { ClawdbotConfig } from "../config/config.js";
import type { WizardPrompter } from "../wizard/prompts.js";
import type { RuntimeEnv } from "../runtime.js";

describe("auth-choice.apply.redpill", () => {
  let mockPrompter: WizardPrompter;
  let mockRuntime: RuntimeEnv;
  let baseConfig: ClawdbotConfig;
  let agentDir: string;

  beforeEach(() => {
    agentDir = "/tmp/test-agent";

    mockPrompter = {
      note: vi.fn().mockResolvedValue(undefined),
      confirm: vi.fn().mockResolvedValue(true),
      text: vi.fn().mockResolvedValue("rp_test_key_12345678"),
    } as unknown as WizardPrompter;

    mockRuntime = {
      env: {},
    } as RuntimeEnv;

    baseConfig = {
      agents: {
        defaults: {},
      },
      models: {
        providers: {},
      },
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("applyAuthChoiceRedpill", () => {
    it("should return null for non-redpill auth choices", async () => {
      const params: ApplyAuthChoiceParams = {
        authChoice: "anthropic-api-key" as any,
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);
      expect(result).toBeNull();
    });

    it("should handle redpill-api-key auth choice", async () => {
      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir: "/tmp/redpill-test-" + Date.now(),
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result).not.toBeNull();
      expect(result?.config).toBeDefined();
    });

    it("should prompt for API key with informational note", async () => {
      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir: "/tmp/redpill-test-note-" + Date.now(),
        setDefaultModel: true,
      };

      await applyAuthChoiceRedpill(params);

      expect(mockPrompter.note).toHaveBeenCalled();
      const noteCall = (mockPrompter.note as any).mock.calls.find(
        (call: any[]) => call[1] === "RedPill AI",
      );
      expect(noteCall).toBeDefined();
      expect(noteCall[0]).toContain("RedPill.ai provides TEE");

      expect(mockPrompter.text).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Enter RedPill API key",
          validate: expect.any(Function),
        }),
      );
    });

    it("should validate API key format (must start with rp_)", async () => {
      let capturedValidate: ((value: string) => string | undefined) | undefined;
      mockPrompter.text = vi.fn().mockImplementation(async (opts) => {
        capturedValidate = opts.validate;
        return "rp_test_key_12345678";
      });

      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir: "/tmp/redpill-test-validate-" + Date.now(),
        setDefaultModel: true,
      };

      await applyAuthChoiceRedpill(params);

      expect(mockPrompter.text).toHaveBeenCalled();
      expect(capturedValidate).toBeDefined();

      if (capturedValidate) {
        expect(capturedValidate("rp_valid_key")).toBeUndefined();
        expect(capturedValidate("invalid_key")).toContain("must start with");
        expect(capturedValidate("")).toBe("Required");
      }
    });

    it("should set default model when setDefaultModel is true", async () => {
      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result?.config.agents?.defaults?.model).toBeDefined();
      expect((result?.config.agents?.defaults?.model as any)?.primary).toBe(
        REDPILL_DEFAULT_MODEL_REF,
      );
    });

    it("should configure RedPill provider", async () => {
      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result?.config.models?.providers?.redpill).toBeDefined();
      expect(result?.config.models?.providers?.redpill?.baseUrl).toBe("https://api.redpill.ai/v1");
      expect(result?.config.models?.providers?.redpill?.api).toBe("openai-completions");
      expect(result?.config.models?.providers?.redpill?.models).toBeDefined();
      expect(Array.isArray(result?.config.models?.providers?.redpill?.models)).toBe(true);
    });

    it("should configure auth profile", async () => {
      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result?.config.auth?.profiles).toBeDefined();
      expect(result?.config.auth?.profiles?.["redpill:default"]).toBeDefined();
      expect(result?.config.auth?.profiles?.["redpill:default"]?.provider).toBe("redpill");
      expect(result?.config.auth?.profiles?.["redpill:default"]?.mode).toBe("api_key");
    });

    it("should use token from opts if provided", async () => {
      mockPrompter.text = vi.fn();

      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
        opts: {
          tokenProvider: "redpill",
          token: "rp_from_opts_12345",
        },
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result).not.toBeNull();
      expect(mockPrompter.text).not.toHaveBeenCalled();
    });

    it("should check for environment variable REDPILL_API_KEY", async () => {
      process.env.REDPILL_API_KEY = "rp_from_env_12345";

      mockPrompter.confirm = vi.fn().mockResolvedValue(true);
      mockPrompter.text = vi.fn();
      mockPrompter.note = vi.fn().mockResolvedValue(undefined);

      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir: "/tmp/redpill-test-env-" + Date.now(),
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result).not.toBeNull();
      expect(mockPrompter.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("REDPILL_API_KEY"),
        }),
      );
      expect(mockPrompter.text).not.toHaveBeenCalled();

      delete process.env.REDPILL_API_KEY;
    });

    it("should set agentModelOverride when setDefaultModel is false", async () => {
      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: false,
        agentId: "test-agent",
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result?.agentModelOverride).toBe(REDPILL_DEFAULT_MODEL_REF);
      expect(mockPrompter.note).toHaveBeenCalledWith(
        expect.stringContaining(REDPILL_DEFAULT_MODEL_REF),
        "Model configured",
      );
    });

    it("should preserve existing model fallbacks", async () => {
      const configWithFallbacks: ClawdbotConfig = {
        agents: {
          defaults: {
            model: {
              primary: "some-model",
              fallbacks: ["fallback-1", "fallback-2"],
            },
          },
        },
        models: {
          providers: {},
        },
      };

      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: configWithFallbacks,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect((result?.config.agents?.defaults?.model as any)?.fallbacks).toEqual([
        "fallback-1",
        "fallback-2",
      ]);
    });

    it("should normalize API key input (trim, remove quotes)", async () => {
      mockPrompter.text = vi.fn().mockResolvedValue('  "rp_quoted_key_12345"  ');

      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result).not.toBeNull();
      expect(result?.config).toBeDefined();
    });

    it("should handle existing credentials in auth profile store", async () => {
      mockPrompter.text = vi.fn();

      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result).not.toBeNull();
    });
  });

  describe("integration", () => {
    it("should produce valid config that can be used for model resolution", async () => {
      const params: ApplyAuthChoiceParams = {
        authChoice: "redpill-api-key",
        config: baseConfig,
        prompter: mockPrompter,
        runtime: mockRuntime,
        agentDir,
        setDefaultModel: true,
      };

      const result = await applyAuthChoiceRedpill(params);

      expect(result).not.toBeNull();
      expect(result?.config).toBeDefined();
      expect(result?.config.models?.providers?.redpill).toBeDefined();
      expect(result?.config.auth?.profiles?.["redpill:default"]).toBeDefined();
      expect((result?.config.agents?.defaults?.model as any)?.primary).toBe(
        REDPILL_DEFAULT_MODEL_REF,
      );
      expect(result?.config.models?.providers?.redpill?.models?.length).toBeGreaterThan(10);
    });
  });
});
