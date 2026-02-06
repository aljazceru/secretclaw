import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "secretclaw", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "secretclaw", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "secretclaw", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "secretclaw", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "secretclaw", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "secretclaw", "status", "--", "ignored"], 2)).toEqual([
      "status",
    ]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "secretclaw", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "secretclaw"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "secretclaw", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "secretclaw", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "secretclaw", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "secretclaw", "status", "--timeout=2500"], "--timeout")).toBe(
      "2500",
    );
    expect(getFlagValue(["node", "secretclaw", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "secretclaw", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "secretclaw", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "secretclaw", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "secretclaw", "status", "--debug"])).toBe(false);
    expect(
      getVerboseFlag(["node", "secretclaw", "status", "--debug"], { includeDebug: true }),
    ).toBe(true);
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "secretclaw", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "secretclaw", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "secretclaw", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "secretclaw", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["node", "secretclaw", "status"],
    });
    expect(nodeArgv).toEqual(["node", "secretclaw", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["node-22", "secretclaw", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "secretclaw", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["node-22.2.0.exe", "secretclaw", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "secretclaw", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["node-22.2", "secretclaw", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "secretclaw", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["node-22.2.exe", "secretclaw", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "secretclaw", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["/usr/bin/node-22.2.0", "secretclaw", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "secretclaw", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["nodejs", "secretclaw", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "secretclaw", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["node-dev", "secretclaw", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual([
      "node",
      "secretclaw",
      "node-dev",
      "secretclaw",
      "status",
    ]);

    const directArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["secretclaw", "status"],
    });
    expect(directArgv).toEqual(["node", "secretclaw", "status"]);

    const bunArgv = buildParseArgv({
      programName: "secretclaw",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "secretclaw",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "secretclaw", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "secretclaw", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "secretclaw", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "secretclaw", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "secretclaw", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "secretclaw", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "secretclaw", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "secretclaw", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
