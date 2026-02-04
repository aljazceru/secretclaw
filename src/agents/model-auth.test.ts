import { describe, expect, it, vi } from "vitest";

describe("getApiKeyForModel", () => {
  it("resolves Maple API key from env", async () => {
    const previousMaple = process.env.MAPLE_API_KEY;

    try {
      process.env.MAPLE_API_KEY = "maple-test-key";

      vi.resetModules();
      const { resolveApiKeyForProvider } = await import("./model-auth.js");

      const resolved = await resolveApiKeyForProvider({
        provider: "maple",
        store: { version: 1, profiles: {} },
      });
      expect(resolved.apiKey).toBe("maple-test-key");
      expect(resolved.source).toContain("MAPLE_API_KEY");
    } finally {
      if (previousMaple === undefined) {
        delete process.env.MAPLE_API_KEY;
      } else {
        process.env.MAPLE_API_KEY = previousMaple;
      }
    }
  });

  it("resolves Privatemode API key from env", async () => {
    const previousPrivatemode = process.env.PRIVATEMODE_API_KEY;

    try {
      process.env.PRIVATEMODE_API_KEY = "privatemode-test-key";

      vi.resetModules();
      const { resolveApiKeyForProvider } = await import("./model-auth.js");

      const resolved = await resolveApiKeyForProvider({
        provider: "privatemode",
        store: { version: 1, profiles: {} },
      });
      expect(resolved.apiKey).toBe("privatemode-test-key");
      expect(resolved.source).toContain("PRIVATEMODE_API_KEY");
    } finally {
      if (previousPrivatemode === undefined) {
        delete process.env.PRIVATEMODE_API_KEY;
      } else {
        process.env.PRIVATEMODE_API_KEY = previousPrivatemode;
      }
    }
  });

  it("prefers Bedrock bearer token over access keys and profile", async () => {
    const previous = {
      bearer: process.env.AWS_BEARER_TOKEN_BEDROCK,
      access: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      profile: process.env.AWS_PROFILE,
    };

    try {
      process.env.AWS_BEARER_TOKEN_BEDROCK = "bedrock-token";
      process.env.AWS_ACCESS_KEY_ID = "access-key";
      process.env.AWS_SECRET_ACCESS_KEY = "secret-key";
      process.env.AWS_PROFILE = "profile";

      vi.resetModules();
      const { resolveApiKeyForProvider } = await import("./model-auth.js");

      const resolved = await resolveApiKeyForProvider({
        provider: "amazon-bedrock",
        store: { version: 1, profiles: {} },
        cfg: {
          models: {
            providers: {
              "amazon-bedrock": {
                baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
                api: "bedrock-converse-stream",
                auth: "aws-sdk",
                models: [],
              },
            },
          },
        } as never,
      });

      expect(resolved.mode).toBe("aws-sdk");
      expect(resolved.apiKey).toBeUndefined();
      expect(resolved.source).toContain("AWS_BEARER_TOKEN_BEDROCK");
    } finally {
      if (previous.bearer === undefined) {
        delete process.env.AWS_BEARER_TOKEN_BEDROCK;
      } else {
        process.env.AWS_BEARER_TOKEN_BEDROCK = previous.bearer;
      }
      if (previous.access === undefined) {
        delete process.env.AWS_ACCESS_KEY_ID;
      } else {
        process.env.AWS_ACCESS_KEY_ID = previous.access;
      }
      if (previous.secret === undefined) {
        delete process.env.AWS_SECRET_ACCESS_KEY;
      } else {
        process.env.AWS_SECRET_ACCESS_KEY = previous.secret;
      }
      if (previous.profile === undefined) {
        delete process.env.AWS_PROFILE;
      } else {
        process.env.AWS_PROFILE = previous.profile;
      }
    }
  });

  it("prefers Bedrock access keys over profile", async () => {
    const previous = {
      bearer: process.env.AWS_BEARER_TOKEN_BEDROCK,
      access: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      profile: process.env.AWS_PROFILE,
    };

    try {
      delete process.env.AWS_BEARER_TOKEN_BEDROCK;
      process.env.AWS_ACCESS_KEY_ID = "access-key";
      process.env.AWS_SECRET_ACCESS_KEY = "secret-key";
      process.env.AWS_PROFILE = "profile";

      vi.resetModules();
      const { resolveApiKeyForProvider } = await import("./model-auth.js");

      const resolved = await resolveApiKeyForProvider({
        provider: "amazon-bedrock",
        store: { version: 1, profiles: {} },
        cfg: {
          models: {
            providers: {
              "amazon-bedrock": {
                baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
                api: "bedrock-converse-stream",
                auth: "aws-sdk",
                models: [],
              },
            },
          },
        } as never,
      });

      expect(resolved.mode).toBe("aws-sdk");
      expect(resolved.apiKey).toBeUndefined();
      expect(resolved.source).toContain("AWS_ACCESS_KEY_ID");
    } finally {
      if (previous.bearer === undefined) {
        delete process.env.AWS_BEARER_TOKEN_BEDROCK;
      } else {
        process.env.AWS_BEARER_TOKEN_BEDROCK = previous.bearer;
      }
      if (previous.access === undefined) {
        delete process.env.AWS_ACCESS_KEY_ID;
      } else {
        process.env.AWS_ACCESS_KEY_ID = previous.access;
      }
      if (previous.secret === undefined) {
        delete process.env.AWS_SECRET_ACCESS_KEY;
      } else {
        process.env.AWS_SECRET_ACCESS_KEY = previous.secret;
      }
      if (previous.profile === undefined) {
        delete process.env.AWS_PROFILE;
      } else {
        process.env.AWS_PROFILE = previous.profile;
      }
    }
  });

  it("uses Bedrock profile when access keys are missing", async () => {
    const previous = {
      bearer: process.env.AWS_BEARER_TOKEN_BEDROCK,
      access: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      profile: process.env.AWS_PROFILE,
    };

    try {
      delete process.env.AWS_BEARER_TOKEN_BEDROCK;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      process.env.AWS_PROFILE = "profile";

      vi.resetModules();
      const { resolveApiKeyForProvider } = await import("./model-auth.js");

      const resolved = await resolveApiKeyForProvider({
        provider: "amazon-bedrock",
        store: { version: 1, profiles: {} },
        cfg: {
          models: {
            providers: {
              "amazon-bedrock": {
                baseUrl: "https://bedrock-runtime.us-east-1.amazonaws.com",
                api: "bedrock-converse-stream",
                auth: "aws-sdk",
                models: [],
              },
            },
          },
        } as never,
      });

      expect(resolved.mode).toBe("aws-sdk");
      expect(resolved.apiKey).toBeUndefined();
      expect(resolved.source).toContain("AWS_PROFILE");
    } finally {
      if (previous.bearer === undefined) {
        delete process.env.AWS_BEARER_TOKEN_BEDROCK;
      } else {
        process.env.AWS_BEARER_TOKEN_BEDROCK = previous.bearer;
      }
      if (previous.access === undefined) {
        delete process.env.AWS_ACCESS_KEY_ID;
      } else {
        process.env.AWS_ACCESS_KEY_ID = previous.access;
      }
      if (previous.secret === undefined) {
        delete process.env.AWS_SECRET_ACCESS_KEY;
      } else {
        process.env.AWS_SECRET_ACCESS_KEY = previous.secret;
      }
      if (previous.profile === undefined) {
        delete process.env.AWS_PROFILE;
      } else {
        process.env.AWS_PROFILE = previous.profile;
      }
    }
  });
});
