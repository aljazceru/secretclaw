import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveGatewayStateDir } from "./paths.js";

describe("resolveGatewayStateDir", () => {
  it("uses the default state dir when no overrides are set", () => {
    const env = { HOME: "/Users/test" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".secretclaw"));
  });

  it("appends the profile suffix when set", () => {
    const env = { HOME: "/Users/test", SECRETCLAW_PROFILE: "rescue" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".secretclaw-rescue"));
  });

  it("treats default profiles as the base state dir", () => {
    const env = { HOME: "/Users/test", SECRETCLAW_PROFILE: "Default" };
    expect(resolveGatewayStateDir(env)).toBe(path.join("/Users/test", ".secretclaw"));
  });

  it("uses SECRETCLAW_STATE_DIR when provided", () => {
    const env = { HOME: "/Users/test", SECRETCLAW_STATE_DIR: "/var/lib/secretclaw" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/var/lib/secretclaw"));
  });

  it("expands ~ in SECRETCLAW_STATE_DIR", () => {
    const env = { HOME: "/Users/test", SECRETCLAW_STATE_DIR: "~/secretclaw-state" };
    expect(resolveGatewayStateDir(env)).toBe(path.resolve("/Users/test/secretclaw-state"));
  });

  it("preserves Windows absolute paths without HOME", () => {
    const env = { SECRETCLAW_STATE_DIR: "C:\\State\\secretclaw" };
    expect(resolveGatewayStateDir(env)).toBe("C:\\State\\secretclaw");
  });
});
