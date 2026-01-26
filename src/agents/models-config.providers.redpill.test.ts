import { describe, expect, it } from "vitest";
import {
  REDPILL_BASE_URL,
  REDPILL_DEFAULT_COST,
  REDPILL_DEFAULT_MODEL_ID,
  REDPILL_DEFAULT_MODEL_REF,
  REDPILL_MODEL_CATALOG,
  buildRedpillModelDefinition,
  buildRedpillProviderConfig,
} from "./models-config.providers.redpill.js";

describe("models-config.providers.redpill", () => {
  describe("constants", () => {
    it("should export correct base URL", () => {
      expect(REDPILL_BASE_URL).toBe("https://api.redpill.ai/v1");
    });

    it("should export correct default model ID", () => {
      expect(REDPILL_DEFAULT_MODEL_ID).toBe("phala/deepseek-chat-v3-0324");
    });

    it("should export correct default model ref", () => {
      expect(REDPILL_DEFAULT_MODEL_REF).toBe("redpill/phala/deepseek-chat-v3-0324");
    });

    it("should export zero-cost pricing", () => {
      expect(REDPILL_DEFAULT_COST).toEqual({
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      });
    });
  });

  describe("REDPILL_MODEL_CATALOG", () => {
    it("should have at least 10 models", () => {
      expect(REDPILL_MODEL_CATALOG.length).toBeGreaterThanOrEqual(10);
    });

    it("should include TEE confidential models with phala/ prefix", () => {
      const teeModels = REDPILL_MODEL_CATALOG.filter((model) => model.tee === true);
      expect(teeModels.length).toBeGreaterThan(0);
      for (const model of teeModels) {
        expect(model.id).toMatch(/^phala\//);
      }
    });

    it("should include standard models without phala/ prefix", () => {
      const standardModels = REDPILL_MODEL_CATALOG.filter((model) => model.tee === false);
      expect(standardModels.length).toBeGreaterThan(0);
      for (const model of standardModels) {
        expect(model.id).not.toMatch(/^phala\//);
      }
    });

    it("should have all required fields for each model", () => {
      for (const model of REDPILL_MODEL_CATALOG) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(typeof model.reasoning).toBe("boolean");
        expect(Array.isArray(model.input)).toBe(true);
        expect(model.input.length).toBeGreaterThan(0);
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.maxTokens).toBeGreaterThan(0);
        expect(typeof model.tee).toBe("boolean");
      }
    });

    it("should include DeepSeek V3 TEE as default model", () => {
      const defaultModel = REDPILL_MODEL_CATALOG.find((m) => m.id === REDPILL_DEFAULT_MODEL_ID);
      expect(defaultModel).toBeDefined();
      expect(defaultModel?.tee).toBe(true);
      expect(defaultModel?.id).toBe("phala/deepseek-chat-v3-0324");
    });

    it("should include DeepSeek R1 TEE with reasoning", () => {
      const r1Model = REDPILL_MODEL_CATALOG.find((m) => m.id === "phala/deepseek-r1");
      expect(r1Model).toBeDefined();
      expect(r1Model?.reasoning).toBe(true);
      expect(r1Model?.tee).toBe(true);
    });

    it("should include Qwen vision model with image input", () => {
      const qwenVision = REDPILL_MODEL_CATALOG.find(
        (m) => m.id === "phala/qwen2.5-vl-72b-instruct",
      );
      expect(qwenVision).toBeDefined();
      expect(qwenVision?.input).toContain("text");
      expect(qwenVision?.input).toContain("image");
      expect(qwenVision?.tee).toBe(true);
    });

    it("should include Llama 3.3 70B TEE", () => {
      const llama = REDPILL_MODEL_CATALOG.find((m) => m.id === "phala/llama-3.3-70b-instruct");
      expect(llama).toBeDefined();
      expect(llama?.tee).toBe(true);
    });

    it("should include Claude Sonnet 4.5 via RedPill", () => {
      const claude = REDPILL_MODEL_CATALOG.find((m) => m.id === "anthropic/claude-sonnet-4.5");
      expect(claude).toBeDefined();
      expect(claude?.tee).toBe(false);
      expect(claude?.reasoning).toBe(true);
      expect(claude?.input).toContain("text");
      expect(claude?.input).toContain("image");
    });

    it("should include GPT-5 via RedPill", () => {
      const gpt5 = REDPILL_MODEL_CATALOG.find((m) => m.id === "openai/gpt-5");
      expect(gpt5).toBeDefined();
      expect(gpt5?.tee).toBe(false);
      expect(gpt5?.reasoning).toBe(true);
    });

    it("should include GPT-5 Mini via RedPill", () => {
      const gpt5mini = REDPILL_MODEL_CATALOG.find((m) => m.id === "openai/gpt-5-mini");
      expect(gpt5mini).toBeDefined();
      expect(gpt5mini?.tee).toBe(false);
    });

    it("should include DeepSeek V3 via RedPill", () => {
      const deepseek = REDPILL_MODEL_CATALOG.find((m) => m.id === "deepseek/deepseek-chat-v3");
      expect(deepseek).toBeDefined();
      expect(deepseek?.tee).toBe(false);
    });

    it("should have unique model IDs", () => {
      const ids = REDPILL_MODEL_CATALOG.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("buildRedpillModelDefinition", () => {
    it("should build model definition from catalog entry", () => {
      const catalogEntry = REDPILL_MODEL_CATALOG[0];
      const modelDef = buildRedpillModelDefinition(catalogEntry);

      expect(modelDef.id).toBe(catalogEntry.id);
      expect(modelDef.name).toBe(catalogEntry.name);
      expect(modelDef.reasoning).toBe(catalogEntry.reasoning);
      expect(modelDef.input).toEqual([...catalogEntry.input]);
      expect(modelDef.cost).toEqual(REDPILL_DEFAULT_COST);
      expect(modelDef.contextWindow).toBe(catalogEntry.contextWindow);
      expect(modelDef.maxTokens).toBe(catalogEntry.maxTokens);
    });

    it("should not include tee field in output", () => {
      const catalogEntry = REDPILL_MODEL_CATALOG[0];
      const modelDef = buildRedpillModelDefinition(catalogEntry);

      expect("tee" in modelDef).toBe(false);
    });

    it("should create independent input array copy", () => {
      const catalogEntry = REDPILL_MODEL_CATALOG[0];
      const modelDef = buildRedpillModelDefinition(catalogEntry);

      expect(modelDef.input).not.toBe(catalogEntry.input);
      expect(modelDef.input).toEqual([...catalogEntry.input]);
    });
  });

  describe("buildRedpillProviderConfig", () => {
    it("should build complete provider config", () => {
      const providerConfig = buildRedpillProviderConfig();

      expect(providerConfig.baseUrl).toBe(REDPILL_BASE_URL);
      expect(providerConfig.api).toBe("openai-completions");
      expect(Array.isArray(providerConfig.models)).toBe(true);
      expect(providerConfig.models.length).toBe(REDPILL_MODEL_CATALOG.length);
    });

    it("should have all models from catalog", () => {
      const providerConfig = buildRedpillProviderConfig();
      const modelIds = providerConfig.models.map((m) => m.id);

      for (const catalogEntry of REDPILL_MODEL_CATALOG) {
        expect(modelIds).toContain(catalogEntry.id);
      }
    });

    it("should transform all models correctly", () => {
      const providerConfig = buildRedpillProviderConfig();

      for (const model of providerConfig.models) {
        expect(model.id).toBeTruthy();
        expect(model.name).toBeTruthy();
        expect(typeof model.reasoning).toBe("boolean");
        expect(Array.isArray(model.input)).toBe(true);
        expect(model.cost).toEqual(REDPILL_DEFAULT_COST);
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.maxTokens).toBeGreaterThan(0);
        expect("tee" in model).toBe(false);
      }
    });
  });

  describe("model categorization", () => {
    it("should have TEE models with phala prefix", () => {
      const teeModels = REDPILL_MODEL_CATALOG.filter((m) => m.tee === true);

      expect(teeModels.length).toBeGreaterThanOrEqual(8);
      for (const model of teeModels) {
        expect(model.id.startsWith("phala/")).toBe(true);
      }
    });

    it("should have standard models without phala prefix", () => {
      const standardModels = REDPILL_MODEL_CATALOG.filter((m) => m.tee === false);

      expect(standardModels.length).toBeGreaterThanOrEqual(10);
      for (const model of standardModels) {
        expect(model.id.startsWith("phala/")).toBe(false);
      }
    });

    it("should have reasoning models", () => {
      const reasoningModels = REDPILL_MODEL_CATALOG.filter((m) => m.reasoning === true);

      expect(reasoningModels.length).toBeGreaterThanOrEqual(5);
      const reasoningIds = reasoningModels.map((m) => m.id);
      expect(reasoningIds).toContain("phala/deepseek-r1");
      expect(reasoningIds).toContain("anthropic/claude-sonnet-4.5");
      expect(reasoningIds).toContain("openai/gpt-5");
    });

    it("should have vision models", () => {
      const visionModels = REDPILL_MODEL_CATALOG.filter((m) => m.input.includes("image"));

      expect(visionModels.length).toBeGreaterThanOrEqual(5);
      const visionIds = visionModels.map((m) => m.id);
      expect(visionIds).toContain("phala/qwen2.5-vl-72b-instruct");
      expect(visionIds).toContain("phala/qwen-qvq-72b-preview");
      expect(visionIds).toContain("anthropic/claude-sonnet-4.5");
    });
  });
});
