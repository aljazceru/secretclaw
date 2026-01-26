import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ClawdbotConfig } from "../config/config.js";
import {
  resolveTtsConfig,
  textToSpeech,
  textToSpeechTelephony,
  resolveTtsProviderOrder,
  isTtsProviderConfigured,
  getTtsProvider,
  resolveTtsPrefsPath,
} from "./tts.js";

describe("Qwen3-TTS Configuration", () => {
  it("should resolve default qwen3 config", () => {
    const cfg: ClawdbotConfig = {};
    const config = resolveTtsConfig(cfg);

    expect(config.qwen3.enabled).toBe(true);
    expect(config.qwen3.baseUrl).toBe("http://localhost:8000");
    expect(config.qwen3.model).toBe("Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice");
    expect(config.qwen3.voice).toBe("Vivian");
    expect(config.qwen3.language).toBe("Auto");
    expect(config.qwen3.instruct).toBeUndefined();
  });

  it("should override qwen3 config with user values", () => {
    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          qwen3: {
            enabled: false,
            baseUrl: "http://192.168.1.100:9000",
            model: "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
            voice: "Dylan",
            language: "English",
            instruct: "speak with excitement",
          },
        },
      },
    };
    const config = resolveTtsConfig(cfg);

    expect(config.qwen3.enabled).toBe(false);
    expect(config.qwen3.baseUrl).toBe("http://192.168.1.100:9000");
    expect(config.qwen3.model).toBe("Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice");
    expect(config.qwen3.voice).toBe("Dylan");
    expect(config.qwen3.language).toBe("English");
    expect(config.qwen3.instruct).toBe("speak with excitement");
  });

  it("should trim qwen3 config values", () => {
    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          qwen3: {
            baseUrl: "  http://localhost:8000  ",
            model: "  Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice  ",
            voice: "  Serena  ",
            language: "  Chinese  ",
            instruct: "  speak calmly  ",
          },
        },
      },
    };
    const config = resolveTtsConfig(cfg);

    expect(config.qwen3.baseUrl).toBe("http://localhost:8000");
    expect(config.qwen3.model).toBe("Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice");
    expect(config.qwen3.voice).toBe("Serena");
    expect(config.qwen3.language).toBe("Chinese");
    expect(config.qwen3.instruct).toBe("speak calmly");
  });

  it("should set qwen3 as default provider", () => {
    const cfg: ClawdbotConfig = {};
    const config = resolveTtsConfig(cfg);

    expect(config.provider).toBe("qwen3");
  });

  it("should respect explicit provider override", () => {
    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "elevenlabs",
        },
      },
    };
    const config = resolveTtsConfig(cfg);

    expect(config.provider).toBe("elevenlabs");
  });
});

describe("Qwen3-TTS Provider Chain", () => {
  it("should include qwen3 in TTS_PROVIDERS", () => {
    const providers = resolveTtsProviderOrder("qwen3");
    expect(providers).toContain("qwen3");
  });

  it("should prioritize qwen3 when selected", () => {
    const providers = resolveTtsProviderOrder("qwen3");
    expect(providers[0]).toBe("qwen3");
  });

  it("should have correct fallback order from qwen3", () => {
    const providers = resolveTtsProviderOrder("qwen3");
    expect(providers).toEqual(["qwen3", "openai", "elevenlabs", "edge"]);
  });

  it("should have correct fallback order from elevenlabs", () => {
    const providers = resolveTtsProviderOrder("elevenlabs");
    expect(providers).toEqual(["elevenlabs", "qwen3", "openai", "edge"]);
  });

  it("should check if qwen3 is configured", () => {
    const cfg: ClawdbotConfig = {};
    const config = resolveTtsConfig(cfg);

    expect(isTtsProviderConfigured(config, "qwen3")).toBe(true);
  });

  it("should respect qwen3 disabled state", () => {
    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          qwen3: {
            enabled: false,
          },
        },
      },
    };
    const config = resolveTtsConfig(cfg);

    expect(isTtsProviderConfigured(config, "qwen3")).toBe(false);
  });

  it("should prioritize qwen3 in getTtsProvider when enabled", () => {
    const cfg: ClawdbotConfig = {};
    const config = resolveTtsConfig(cfg);
    const prefsPath = resolveTtsPrefsPath(config);

    expect(getTtsProvider(config, prefsPath)).toBe("qwen3");
  });

  it("should skip qwen3 in getTtsProvider when disabled", () => {
    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          qwen3: {
            enabled: false,
          },
        },
      },
    };
    const config = resolveTtsConfig(cfg);
    const prefsPath = resolveTtsPrefsPath(config);

    expect(getTtsProvider(config, prefsPath)).not.toBe("qwen3");
  });
});

describe("Qwen3-TTS Integration", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call qwen3 API with correct parameters", async () => {
    const mockEventId = "test-event-123";
    const mockAudioData = Array.from({ length: 1000 }, () => 0);
    const mockSampleRate = 12000;

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ event_id: mockEventId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `data: ${JSON.stringify([mockSampleRate, { name: "audio.wav", data: mockAudioData }])}`,
      });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
          qwen3: {
            enabled: true,
            baseUrl: "http://localhost:8000",
            voice: "Vivian",
            language: "English",
          },
        },
      },
    };

    const result = await textToSpeech({
      text: "Hello world",
      cfg,
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("qwen3");
    expect(result.audioPath).toBeDefined();
    expect(result.outputFormat).toBe("wav");
    expect(global.fetch).toHaveBeenCalledTimes(2);

    const submitCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(submitCall[0]).toBe("http://localhost:8000/call/generate_custom_voice");
    expect(submitCall[1].method).toBe("POST");

    const submitBody = JSON.parse(submitCall[1].body);
    expect(submitBody.data).toEqual(["Hello world", "English", "Vivian", "", "1.7B"]);

    const streamCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(streamCall[0]).toBe(`http://localhost:8000/call/generate_custom_voice/${mockEventId}`);
  });

  it("should handle qwen3 API errors gracefully", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
        },
      },
    };

    const result = await textToSpeech({
      text: "Hello world",
      cfg,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("qwen3");
  });

  it("should fall back to next provider when qwen3 fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
        },
      },
    };

    const result = await textToSpeech({
      text: "Hello world",
      cfg,
    });

    expect(result.success).toBe(false);
  });

  it("should handle missing event_id", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
        },
      },
    };

    const result = await textToSpeech({
      text: "Hello world",
      cfg,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("event_id");
  });

  it("should handle missing audio data in response", async () => {
    const mockEventId = "test-event-456";

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ event_id: mockEventId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => "data: invalid",
      });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
        },
      },
    };

    const result = await textToSpeech({
      text: "Hello world",
      cfg,
    });

    expect(result.success).toBe(false);
  });

  it("should respect timeout", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ event_id: "test" }),
              }),
            10000,
          ),
        ),
    );

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
          timeoutMs: 100,
        },
      },
    };

    const result = await textToSpeech({
      text: "Hello world",
      cfg,
    });

    expect(result.success).toBe(false);
  });

  it("should normalize baseUrl by removing trailing slashes", async () => {
    const mockEventId = "test-event-789";
    const mockAudioData = Array.from({ length: 500 }, () => 0);
    const mockSampleRate = 12000;

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ event_id: mockEventId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `data: ${JSON.stringify([mockSampleRate, { name: "audio.wav", data: mockAudioData }])}`,
      });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
          qwen3: {
            baseUrl: "http://localhost:8000///",
          },
        },
      },
    };

    const result = await textToSpeech({
      text: "Test",
      cfg,
    });

    expect(result.success).toBe(true);
    const submitCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(submitCall[0]).toBe("http://localhost:8000/call/generate_custom_voice");
  });

  it("should use 0.6B model size for 0.6B models", async () => {
    const mockEventId = "test-event-0.6b";
    const mockAudioData = Array.from({ length: 500 }, () => 0);
    const mockSampleRate = 12000;

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ event_id: mockEventId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `data: ${JSON.stringify([mockSampleRate, { name: "audio.wav", data: mockAudioData }])}`,
      });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
          qwen3: {
            model: "Qwen/Qwen3-TTS-12Hz-0.6B-CustomVoice",
          },
        },
      },
    };

    const result = await textToSpeech({
      text: "Test",
      cfg,
    });

    expect(result.success).toBe(true);
    const submitCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const submitBody = JSON.parse(submitCall[1].body);
    expect(submitBody.data[4]).toBe("0.6B");
  });

  it("should pass instruct parameter when provided", async () => {
    const mockEventId = "test-event-instruct";
    const mockAudioData = Array.from({ length: 500 }, () => 0);
    const mockSampleRate = 12000;

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ event_id: mockEventId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `data: ${JSON.stringify([mockSampleRate, { name: "audio.wav", data: mockAudioData }])}`,
      });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
          qwen3: {
            instruct: "speak with excitement",
          },
        },
      },
    };

    const result = await textToSpeech({
      text: "Test",
      cfg,
    });

    expect(result.success).toBe(true);
    const submitCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const submitBody = JSON.parse(submitCall[1].body);
    expect(submitBody.data[3]).toBe("speak with excitement");
  });

  it("should not support telephony", async () => {
    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
        },
      },
    };

    const result = await textToSpeechTelephony({
      text: "Hello world",
      cfg,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("qwen3");
    expect(result.error).toContain("unsupported");
  });
});

describe("Qwen3-TTS Voice and Language", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should use default voice Vivian", async () => {
    const mockEventId = "test-voice";
    const mockAudioData = Array.from({ length: 500 }, () => 0);
    const mockSampleRate = 12000;

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ event_id: mockEventId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `data: ${JSON.stringify([mockSampleRate, { name: "audio.wav", data: mockAudioData }])}`,
      });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
        },
      },
    };

    await textToSpeech({ text: "Test", cfg });

    const submitCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const submitBody = JSON.parse(submitCall[1].body);
    expect(submitBody.data[2]).toBe("Vivian");
  });

  it("should support all predefined voices", async () => {
    const voices = [
      "Vivian",
      "Serena",
      "Uncle_Fu",
      "Dylan",
      "Eric",
      "Ryan",
      "Aiden",
      "Ono_Anna",
      "Sohee",
    ];

    for (const voice of voices) {
      const mockEventId = `test-${voice}`;
      const mockAudioData = Array.from({ length: 500 }, () => 0);
      const mockSampleRate = 12000;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ event_id: mockEventId }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () =>
            `data: ${JSON.stringify([mockSampleRate, { name: "audio.wav", data: mockAudioData }])}`,
        });

      const cfg: ClawdbotConfig = {
        messages: {
          tts: {
            provider: "qwen3",
            qwen3: {
              voice,
            },
          },
        },
      };

      const result = await textToSpeech({ text: "Test", cfg });
      expect(result.success).toBe(true);
    }
  });

  it("should use default language Auto", async () => {
    const mockEventId = "test-lang";
    const mockAudioData = Array.from({ length: 500 }, () => 0);
    const mockSampleRate = 12000;

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ event_id: mockEventId }),
      })
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          `data: ${JSON.stringify([mockSampleRate, { name: "audio.wav", data: mockAudioData }])}`,
      });

    const cfg: ClawdbotConfig = {
      messages: {
        tts: {
          provider: "qwen3",
        },
      },
    };

    await textToSpeech({ text: "Test", cfg });

    const submitCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const submitBody = JSON.parse(submitCall[1].body);
    expect(submitBody.data[1]).toBe("Auto");
  });

  it("should support all language options", async () => {
    const languages = [
      "Auto",
      "Chinese",
      "English",
      "Japanese",
      "Korean",
      "German",
      "French",
      "Russian",
      "Portuguese",
      "Spanish",
      "Italian",
    ];

    for (const language of languages) {
      const mockEventId = `test-${language}`;
      const mockAudioData = Array.from({ length: 500 }, () => 0);
      const mockSampleRate = 12000;

      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ event_id: mockEventId }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () =>
            `data: ${JSON.stringify([mockSampleRate, { name: "audio.wav", data: mockAudioData }])}`,
        });

      const cfg: ClawdbotConfig = {
        messages: {
          tts: {
            provider: "qwen3",
            qwen3: {
              language,
            },
          },
        },
      };

      const result = await textToSpeech({ text: "Test", cfg });
      expect(result.success).toBe(true);
    }
  });
});
