import { createRequire } from "node:module";

declare const __SECRETCLAW_VERSION__: string | undefined;

function readVersionFromPackageJson(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../package.json") as { version?: string };
    return pkg.version ?? null;
  } catch {
    return null;
  }
}

function readVersionFromBuildInfo(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const candidates = ["../build-info.json", "./build-info.json"];
    for (const candidate of candidates) {
      try {
        const info = require(candidate) as { version?: string };
        if (info.version) {
          return info.version;
        }
      } catch {
        // ignore missing candidate
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Single source of truth for the current SecretClaw version.
// - Embedded/bundled builds: injected define or env var.
// - Dev/npm builds: package.json.
export const VERSION =
  (typeof __SECRETCLAW_VERSION__ === "string" && __SECRETCLAW_VERSION__) ||
  process.env.SECRETCLAW_BUNDLED_VERSION ||
  readVersionFromPackageJson() ||
  readVersionFromBuildInfo() ||
  "0.0.0";
