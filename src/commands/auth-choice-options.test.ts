import { describe, expect, it } from "vitest";
import type { AuthProfileStore } from "../agents/auth-profiles.js";
import { buildAuthChoiceOptions } from "./auth-choice-options.js";

describe("buildAuthChoiceOptions", () => {
  it("includes Maple AI auth choice", () => {
    const store: AuthProfileStore = { version: 1, profiles: {} };
    const options = buildAuthChoiceOptions({
      store,
      includeSkip: false,
    });

    expect(options.some((opt) => opt.value === "maple-api-key")).toBe(true);
  });

  it("includes Privatemode auth choice", () => {
    const store: AuthProfileStore = { version: 1, profiles: {} };
    const options = buildAuthChoiceOptions({
      store,
      includeSkip: false,
    });

    expect(options.some((opt) => opt.value === "privatemode-api-key")).toBe(true);
  });

  it("includes skip when requested", () => {
    const store: AuthProfileStore = { version: 1, profiles: {} };
    const options = buildAuthChoiceOptions({
      store,
      includeSkip: true,
    });

    expect(options.some((opt) => opt.value === "skip")).toBe(true);
  });
});
