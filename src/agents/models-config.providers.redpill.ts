import type { ModelDefinitionConfig } from "../config/types.js";
import type { ProviderConfig } from "./models-config.providers.js";

export const REDPILL_BASE_URL = "https://api.redpill.ai/v1";
export const REDPILL_DEFAULT_MODEL_ID = "phala/deepseek-chat-v3-0324";
export const REDPILL_DEFAULT_MODEL_REF = `redpill/${REDPILL_DEFAULT_MODEL_ID}`;

/**
 * RedPill.ai provides OpenAI-compatible API with TEE (Trusted Execution Environment)
 * confidential inference. Models prefixed with "phala/" run in TEE with cryptographic
 * attestation available at /v1/signature/{REQUEST_ID}.
 *
 * Cost is set to 0 as RedPill uses credit-based pricing that varies by model and usage.
 */
export const REDPILL_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

/**
 * Complete catalog of RedPill.ai models.
 *
 * Models are organized into two categories:
 * 1. TEE Confidential Models (phala/* prefix) - Cryptographically verifiable private execution
 * 2. Standard Models (via RedPill proxy) - Access to frontier models through RedPill's API
 */
export const REDPILL_MODEL_CATALOG = [
  // ============================================
  // TEE CONFIDENTIAL MODELS (phala/* prefix)
  // ============================================

  // DeepSeek models (TEE)
  {
    id: "phala/deepseek-chat-v3-0324",
    name: "DeepSeek V3 0324 (TEE)",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    tee: true,
  },
  {
    id: "phala/deepseek-r1",
    name: "DeepSeek R1 (TEE)",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    tee: true,
  },

  // Qwen models (TEE)
  {
    id: "phala/qwen2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct (TEE)",
    reasoning: false,
    input: ["text"],
    contextWindow: 131072,
    maxTokens: 8192,
    tee: true,
  },
  {
    id: "phala/qwen2.5-vl-72b-instruct",
    name: "Qwen 2.5 VL 72B Instruct (TEE)",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 131072,
    maxTokens: 8192,
    tee: true,
  },
  {
    id: "phala/qwen-qvq-72b-preview",
    name: "Qwen QVQ 72B Preview (TEE)",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 131072,
    maxTokens: 8192,
    tee: true,
  },

  // Llama models (TEE)
  {
    id: "phala/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct (TEE)",
    reasoning: false,
    input: ["text"],
    contextWindow: 131072,
    maxTokens: 8192,
    tee: true,
  },
  {
    id: "phala/llama-3.1-405b-instruct",
    name: "Llama 3.1 405B Instruct (TEE)",
    reasoning: false,
    input: ["text"],
    contextWindow: 131072,
    maxTokens: 8192,
    tee: true,
  },

  // Mistral models (TEE)
  {
    id: "phala/mistral-large-2411",
    name: "Mistral Large 2411 (TEE)",
    reasoning: false,
    input: ["text"],
    contextWindow: 131072,
    maxTokens: 8192,
    tee: true,
  },

  // Gemma models (TEE)
  {
    id: "phala/gemma-2-27b-it",
    name: "Gemma 2 27B IT (TEE)",
    reasoning: false,
    input: ["text"],
    contextWindow: 8192,
    maxTokens: 4096,
    tee: true,
  },

  // ============================================
  // STANDARD MODELS (via RedPill proxy)
  // ============================================

  // Anthropic models (via RedPill)
  {
    id: "anthropic/claude-sonnet-4.5",
    name: "Claude Sonnet 4.5 (via RedPill)",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    tee: false,
  },
  {
    id: "anthropic/claude-opus-4.5",
    name: "Claude Opus 4.5 (via RedPill)",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    tee: false,
  },
  {
    id: "anthropic/claude-sonnet-3.7",
    name: "Claude Sonnet 3.7 (via RedPill)",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 8192,
    tee: false,
  },

  // OpenAI models (via RedPill)
  {
    id: "openai/gpt-5",
    name: "GPT-5 (via RedPill)",
    reasoning: true,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 16384,
    tee: false,
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini (via RedPill)",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 200000,
    maxTokens: 16384,
    tee: false,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o (via RedPill)",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 128000,
    maxTokens: 16384,
    tee: false,
  },

  // DeepSeek models (via RedPill)
  {
    id: "deepseek/deepseek-chat-v3",
    name: "DeepSeek V3 (via RedPill)",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    tee: false,
  },
  {
    id: "deepseek/deepseek-reasoner",
    name: "DeepSeek Reasoner (via RedPill)",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
    tee: false,
  },

  // Google models (via RedPill)
  {
    id: "google/gemini-2.0-flash-exp",
    name: "Gemini 2.0 Flash Exp (via RedPill)",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 1000000,
    maxTokens: 8192,
    tee: false,
  },
  {
    id: "google/gemini-1.5-pro",
    name: "Gemini 1.5 Pro (via RedPill)",
    reasoning: false,
    input: ["text", "image"],
    contextWindow: 2097152,
    maxTokens: 8192,
    tee: false,
  },
] as const;

export type RedpillCatalogEntry = (typeof REDPILL_MODEL_CATALOG)[number];

/**
 * Build a ModelDefinitionConfig from a RedPill catalog entry.
 *
 * Note: The `tee` field from the catalog is not included in the output
 * as ModelDefinitionConfig doesn't support custom metadata fields. TEE
 * capability is inherent to models with the phala/ prefix and documented
 * in the catalog/docs.
 */
export function buildRedpillModelDefinition(entry: RedpillCatalogEntry): ModelDefinitionConfig {
  return {
    id: entry.id,
    name: entry.name,
    reasoning: entry.reasoning,
    input: [...entry.input],
    cost: REDPILL_DEFAULT_COST,
    contextWindow: entry.contextWindow,
    maxTokens: entry.maxTokens,
  };
}

/**
 * Build the complete RedPill provider configuration.
 *
 * RedPill uses OpenAI-compatible API format with models from multiple providers.
 * Models prefixed with "phala/" run in Trusted Execution Environments (TEE) with
 * cryptographic attestation for verifiable privacy.
 */
export function buildRedpillProviderConfig(): ProviderConfig {
  return {
    baseUrl: REDPILL_BASE_URL,
    api: "openai-completions",
    models: REDPILL_MODEL_CATALOG.map(buildRedpillModelDefinition),
  };
}
