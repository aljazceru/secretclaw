import type { ModelDefinitionConfig } from "../config/types.js";

/**
 * Privatemode Provider
 *
 * Privatemode uses an attestation-enforcing proxy (by Edgeless Systems) that
 * verifies TEE deployments and transparently encrypts prompts/responses.
 * Users run the proxy locally, then point their tools at the local endpoint.
 *
 * Default proxy URL: http://127.0.0.1:8080/v1
 */

export const PRIVATEMODE_DEFAULT_BASE_URL = "http://127.0.0.1:8080/v1";
export const PRIVATEMODE_DEFAULT_MODEL_ID = "llama-3.3-70b";
export const PRIVATEMODE_DEFAULT_MODEL_REF = `privatemode/${PRIVATEMODE_DEFAULT_MODEL_ID}`;

// Privatemode uses flat pricing per million tokens (proxy-local, zero cost).
export const PRIVATEMODE_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

/**
 * Static catalog of Privatemode models.
 *
 * All models run behind the Privatemode attestation proxy which enforces
 * TEE verification and encrypts all traffic end-to-end.
 *
 * This catalog serves as a fallback when the proxy API is unreachable.
 */
export const PRIVATEMODE_MODEL_CATALOG = [
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    description: "General reasoning, conversation, coding",
    reasoning: false,
    input: ["text"] as const,
    contextWindow: 131072,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "deepseek-r1-0528",
    name: "DeepSeek R1",
    description: "Research, advanced math, coding",
    reasoning: true,
    input: ["text"] as const,
    contextWindow: 131072,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "qwen3-235b-a22b",
    name: "Qwen3 235B",
    description: "Large-scale reasoning, multilingual, coding",
    reasoning: true,
    input: ["text"] as const,
    contextWindow: 131072,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
  {
    id: "mistral-large-2411",
    name: "Mistral Large",
    description: "Multilingual reasoning, code generation",
    reasoning: false,
    input: ["text"] as const,
    contextWindow: 131072,
    maxTokens: 8192,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  },
] as const;

export type PrivatemodeCatalogEntry = (typeof PRIVATEMODE_MODEL_CATALOG)[number];

/**
 * Build a ModelDefinitionConfig from a Privatemode catalog entry.
 */
export function buildPrivatemodeModelDefinition(
  entry: PrivatemodeCatalogEntry,
): ModelDefinitionConfig {
  return {
    id: entry.id,
    name: entry.name,
    reasoning: entry.reasoning,
    input: [...entry.input],
    cost: entry.cost,
    contextWindow: entry.contextWindow,
    maxTokens: entry.maxTokens,
  };
}

// Privatemode API response types (OpenAI-compatible)
interface PrivatemodeModel {
  id: string;
  object: string;
  owned_by?: string;
}

interface PrivatemodeModelsResponse {
  object: string;
  data: PrivatemodeModel[];
}

/**
 * Discover models from Privatemode proxy with fallback to static catalog.
 * Authentication is optional for local proxy; required in production.
 */
export async function discoverPrivatemodeModels(params?: {
  baseUrl?: string;
  apiKey?: string;
}): Promise<ModelDefinitionConfig[]> {
  // Skip API discovery in test environment
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return PRIVATEMODE_MODEL_CATALOG.map(buildPrivatemodeModelDefinition);
  }

  const baseUrl = params?.baseUrl ?? PRIVATEMODE_DEFAULT_BASE_URL;
  const apiKey = params?.apiKey;

  try {
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/models`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(
        `[privatemode-models] Failed to discover models: HTTP ${response.status}, using static catalog`,
      );
      return PRIVATEMODE_MODEL_CATALOG.map(buildPrivatemodeModelDefinition);
    }

    const data = (await response.json()) as PrivatemodeModelsResponse;
    if (!Array.isArray(data.data) || data.data.length === 0) {
      console.warn("[privatemode-models] No models found from proxy, using static catalog");
      return PRIVATEMODE_MODEL_CATALOG.map(buildPrivatemodeModelDefinition);
    }

    // Merge discovered models with catalog metadata
    const catalogById = new Map<string, PrivatemodeCatalogEntry>(
      PRIVATEMODE_MODEL_CATALOG.map((m) => [m.id, m]),
    );
    const models: ModelDefinitionConfig[] = [];

    for (const apiModel of data.data) {
      const catalogEntry = catalogById.get(apiModel.id);
      if (catalogEntry) {
        // Use catalog metadata for known models
        models.push(buildPrivatemodeModelDefinition(catalogEntry));
      } else {
        // Create definition for newly discovered models not in catalog
        const isReasoning =
          apiModel.id.toLowerCase().includes("thinking") ||
          apiModel.id.toLowerCase().includes("reason") ||
          apiModel.id.toLowerCase().includes("r1");

        models.push({
          id: apiModel.id,
          name: apiModel.id,
          reasoning: isReasoning,
          input: ["text"],
          cost: PRIVATEMODE_DEFAULT_COST,
          contextWindow: 128000,
          maxTokens: 8192,
        });
      }
    }

    return models.length > 0
      ? models
      : PRIVATEMODE_MODEL_CATALOG.map(buildPrivatemodeModelDefinition);
  } catch (error) {
    console.warn(`[privatemode-models] Discovery failed: ${String(error)}, using static catalog`);
    return PRIVATEMODE_MODEL_CATALOG.map(buildPrivatemodeModelDefinition);
  }
}
