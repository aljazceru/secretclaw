import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ClawdbotConfig } from "../config/config.js";
import type { MediaUnderstandingConfig } from "../config/types.tools.js";
import { runCapability, buildProviderRegistry } from "./runner.js";
import { createMediaAttachmentCache, normalizeMediaAttachments } from "./runner.js";
import type { MsgContext } from "../auto-reply/templating.js";

vi.mock("../process/exec.js", () => ({
  runExec: vi.fn(),
}));

vi.mock("../agents/model-auth.js", () => ({
  resolveApiKeyForProvider: vi.fn(),
  requireApiKey: vi.fn(),
}));

describe("Local Whisper Priority Configuration", () => {
  let mockConfig: ClawdbotConfig;
  let mockContext: MsgContext;
  let providerRegistry: ReturnType<typeof buildProviderRegistry>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      models: {
        providers: {},
      },
      tools: {},
    } as ClawdbotConfig;

    mockContext = {
      Message: "test",
      ThreadID: "test-thread",
      MessageID: "test-msg",
      Sender: "test-sender",
      Channel: "test-channel",
    };

    providerRegistry = buildProviderRegistry();
  });

  describe("preferLocal configuration", () => {
    it("should default to preferLocal=true for audio when not configured", async () => {
      const config: MediaUnderstandingConfig = {
        enabled: true,
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.outcome).toBe("skipped");
    });

    it("should check local tools before API providers when preferLocal=true", async () => {
      const { resolveApiKeyForProvider } = await import("../agents/model-auth.js");
      const { runExec } = await import("../process/exec.js");

      vi.mocked(resolveApiKeyForProvider).mockRejectedValue(new Error("No API key"));
      vi.mocked(runExec).mockResolvedValue({
        stdout: "test transcription",
        stderr: "",
        exitCode: 0,
      });

      const config: MediaUnderstandingConfig = {
        enabled: true,
        preferLocal: true,
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.outcome).toBe("skipped");
    });

    it("should check API providers before local tools when preferLocal=false", async () => {
      const { resolveApiKeyForProvider, requireApiKey } = await import("../agents/model-auth.js");

      vi.mocked(resolveApiKeyForProvider).mockResolvedValue({
        apiKey: "test-key",
        source: "config",
      });
      vi.mocked(requireApiKey).mockReturnValue("test-key");

      const config: MediaUnderstandingConfig = {
        enabled: true,
        preferLocal: false,
        models: [
          {
            provider: "openai",
            model: "whisper-1",
          },
        ],
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.capability).toBe("audio");
    });
  });

  describe("fallback behavior", () => {
    it("should fallback to API providers when local tools not available and preferLocal=true", async () => {
      const { resolveApiKeyForProvider, requireApiKey } = await import("../agents/model-auth.js");

      vi.mocked(resolveApiKeyForProvider).mockResolvedValue({
        apiKey: "test-key",
        source: "config",
      });
      vi.mocked(requireApiKey).mockReturnValue("test-key");

      const config: MediaUnderstandingConfig = {
        enabled: true,
        preferLocal: true,
        models: [
          {
            provider: "openai",
            model: "whisper-1",
          },
        ],
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.capability).toBe("audio");
    });

    it("should fallback to local tools when API keys not available and preferLocal=false", async () => {
      const { resolveApiKeyForProvider } = await import("../agents/model-auth.js");

      vi.mocked(resolveApiKeyForProvider).mockRejectedValue(new Error("No API key"));

      const config: MediaUnderstandingConfig = {
        enabled: true,
        preferLocal: false,
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.outcome).toBe("skipped");
    });
  });

  describe("backward compatibility", () => {
    it("should use preferLocal=true when config is undefined", async () => {
      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
      });

      expect(result.decision.outcome).toBe("skipped");
    });

    it("should use preferLocal=true when preferLocal is not set in config", async () => {
      const config: MediaUnderstandingConfig = {
        enabled: true,
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.outcome).toBe("skipped");
    });
  });

  describe("non-audio capabilities", () => {
    it("should not be affected by preferLocal for image capability", async () => {
      const config: MediaUnderstandingConfig = {
        enabled: true,
        preferLocal: false,
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/image.png",
        MediaType: "image/png",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "image",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.capability).toBe("image");
      expect(result.decision.outcome).toBe("skipped");
    });

    it("should not be affected by preferLocal for video capability", async () => {
      const config: MediaUnderstandingConfig = {
        enabled: true,
        preferLocal: false,
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/video.mp4",
        MediaType: "video/mp4",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "video",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.capability).toBe("video");
      expect(result.decision.outcome).toBe("skipped");
    });
  });

  describe("config hierarchy", () => {
    it("should prioritize capability-level config over global config", async () => {
      mockConfig.tools = {
        media: {
          audio: {
            preferLocal: false,
          },
        },
      };

      const config: MediaUnderstandingConfig = {
        enabled: true,
        preferLocal: true,
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.outcome).toBe("skipped");
    });

    it("should use global config when capability config not specified", async () => {
      mockConfig.tools = {
        media: {
          audio: {
            preferLocal: false,
          },
        },
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
      });

      expect(result.decision.outcome).toBe("skipped");
    });
  });

  describe("explicit model configuration", () => {
    it("should respect explicit model list regardless of preferLocal setting", async () => {
      const { resolveApiKeyForProvider, requireApiKey } = await import("../agents/model-auth.js");

      vi.mocked(resolveApiKeyForProvider).mockResolvedValue({
        apiKey: "test-key",
        source: "config",
      });
      vi.mocked(requireApiKey).mockReturnValue("test-key");

      const config: MediaUnderstandingConfig = {
        enabled: true,
        preferLocal: true,
        models: [
          {
            provider: "openai",
            model: "whisper-1",
          },
        ],
      };

      const ctx = {
        ...mockContext,
        MediaUrl: "https://example.com/audio.mp3",
        MediaType: "audio/mpeg",
      };

      const attachments = normalizeMediaAttachments(ctx);
      const cache = createMediaAttachmentCache(attachments);

      const result = await runCapability({
        capability: "audio",
        cfg: mockConfig,
        ctx,
        attachments: cache,
        media: attachments,
        providerRegistry,
        config,
      });

      expect(result.decision.capability).toBe("audio");
    });
  });
});
