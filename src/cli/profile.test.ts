import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatCliCommand } from "./command-format.js";
import { applyCliProfileEnv, parseCliProfileArgs } from "./profile.js";

describe("parseCliProfileArgs", () => {
  it("leaves gateway --dev for subcommands", () => {
    const res = parseCliProfileArgs([
      "node",
      "secretclaw",
      "gateway",
      "--dev",
      "--allow-unconfigured",
    ]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBeNull();
    expect(res.argv).toEqual(["node", "secretclaw", "gateway", "--dev", "--allow-unconfigured"]);
  });

  it("still accepts global --dev before subcommand", () => {
    const res = parseCliProfileArgs(["node", "secretclaw", "--dev", "gateway"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("dev");
    expect(res.argv).toEqual(["node", "secretclaw", "gateway"]);
  });

  it("parses --profile value and strips it", () => {
    const res = parseCliProfileArgs(["node", "secretclaw", "--profile", "work", "status"]);
    if (!res.ok) {
      throw new Error(res.error);
    }
    expect(res.profile).toBe("work");
    expect(res.argv).toEqual(["node", "secretclaw", "status"]);
  });

  it("rejects missing profile value", () => {
    const res = parseCliProfileArgs(["node", "secretclaw", "--profile"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (dev first)", () => {
    const res = parseCliProfileArgs(["node", "secretclaw", "--dev", "--profile", "work", "status"]);
    expect(res.ok).toBe(false);
  });

  it("rejects combining --dev with --profile (profile first)", () => {
    const res = parseCliProfileArgs(["node", "secretclaw", "--profile", "work", "--dev", "status"]);
    expect(res.ok).toBe(false);
  });
});

describe("applyCliProfileEnv", () => {
  it("fills env defaults for dev profile", () => {
    const env: Record<string, string | undefined> = {};
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    const expectedStateDir = path.join("/home/peter", ".secretclaw-dev");
    expect(env.SECRETCLAW_PROFILE).toBe("dev");
    expect(env.SECRETCLAW_STATE_DIR).toBe(expectedStateDir);
    expect(env.SECRETCLAW_CONFIG_PATH).toBe(path.join(expectedStateDir, "secretclaw.json"));
    expect(env.SECRETCLAW_GATEWAY_PORT).toBe("19001");
  });

  it("does not override explicit env values", () => {
    const env: Record<string, string | undefined> = {
      SECRETCLAW_STATE_DIR: "/custom",
      SECRETCLAW_GATEWAY_PORT: "19099",
    };
    applyCliProfileEnv({
      profile: "dev",
      env,
      homedir: () => "/home/peter",
    });
    expect(env.SECRETCLAW_STATE_DIR).toBe("/custom");
    expect(env.SECRETCLAW_GATEWAY_PORT).toBe("19099");
    expect(env.SECRETCLAW_CONFIG_PATH).toBe(path.join("/custom", "secretclaw.json"));
  });
});

describe("formatCliCommand", () => {
  it("returns command unchanged when no profile is set", () => {
    expect(formatCliCommand("secretclaw doctor --fix", {})).toBe("secretclaw doctor --fix");
  });

  it("returns command unchanged when profile is default", () => {
    expect(formatCliCommand("secretclaw doctor --fix", { SECRETCLAW_PROFILE: "default" })).toBe(
      "secretclaw doctor --fix",
    );
  });

  it("returns command unchanged when profile is Default (case-insensitive)", () => {
    expect(formatCliCommand("secretclaw doctor --fix", { SECRETCLAW_PROFILE: "Default" })).toBe(
      "secretclaw doctor --fix",
    );
  });

  it("returns command unchanged when profile is invalid", () => {
    expect(formatCliCommand("secretclaw doctor --fix", { SECRETCLAW_PROFILE: "bad profile" })).toBe(
      "secretclaw doctor --fix",
    );
  });

  it("returns command unchanged when --profile is already present", () => {
    expect(
      formatCliCommand("secretclaw --profile work doctor --fix", { SECRETCLAW_PROFILE: "work" }),
    ).toBe("secretclaw --profile work doctor --fix");
  });

  it("returns command unchanged when --dev is already present", () => {
    expect(formatCliCommand("secretclaw --dev doctor", { SECRETCLAW_PROFILE: "dev" })).toBe(
      "secretclaw --dev doctor",
    );
  });

  it("inserts --profile flag when profile is set", () => {
    expect(formatCliCommand("secretclaw doctor --fix", { SECRETCLAW_PROFILE: "work" })).toBe(
      "secretclaw --profile work doctor --fix",
    );
  });

  it("trims whitespace from profile", () => {
    expect(
      formatCliCommand("secretclaw doctor --fix", { SECRETCLAW_PROFILE: "  jbsecretclaw  " }),
    ).toBe("secretclaw --profile jbsecretclaw doctor --fix");
  });

  it("handles command with no args after secretclaw", () => {
    expect(formatCliCommand("secretclaw", { SECRETCLAW_PROFILE: "test" })).toBe(
      "secretclaw --profile test",
    );
  });

  it("handles pnpm wrapper", () => {
    expect(formatCliCommand("pnpm secretclaw doctor", { SECRETCLAW_PROFILE: "work" })).toBe(
      "pnpm secretclaw --profile work doctor",
    );
  });
});
