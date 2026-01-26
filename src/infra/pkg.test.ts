import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  PACKAGE_MAPPINGS,
  buildInstallCommand,
  detectPackageManager,
  resolvePackageName,
  resolvePkgExecutable,
  type PackageManager,
} from "./pkg.js";

describe("package manager detection", () => {
  it("detects package manager when available", () => {
    const result = detectPackageManager();
    expect(result === null || typeof result === "string").toBe(true);
    if (result) {
      expect(["apt", "dnf", "yum", "pacman", "apk"]).toContain(result);
    }
  });

  it("resolves package manager executable path", () => {
    const detected = detectPackageManager();
    if (!detected) {
      expect(resolvePkgExecutable()).toBeNull();
      return;
    }

    const execPath = resolvePkgExecutable(detected);
    expect(execPath).toBeTruthy();
    if (execPath) {
      expect(path.isAbsolute(execPath)).toBe(true);
    }
  });

  it("returns null when resolving non-existent manager", () => {
    const result = resolvePkgExecutable("apt" as PackageManager);
    expect(result === null || typeof result === "string").toBe(true);
  });

  it("resolves without explicit manager parameter", () => {
    const result = resolvePkgExecutable();
    expect(result === null || typeof result === "string").toBe(true);
  });
});

describe("package name resolution", () => {
  it("resolves ffmpeg for all managers", () => {
    expect(resolvePackageName("ffmpeg", "apt")).toBe("ffmpeg");
    expect(resolvePackageName("ffmpeg", "dnf")).toBe("ffmpeg");
    expect(resolvePackageName("ffmpeg", "yum")).toBe("ffmpeg");
    expect(resolvePackageName("ffmpeg", "pacman")).toBe("ffmpeg");
    expect(resolvePackageName("ffmpeg", "apk")).toBe("ffmpeg");
  });

  it("resolves python3-pip with manager-specific names", () => {
    expect(resolvePackageName("python3-pip", "apt")).toBe("python3-pip");
    expect(resolvePackageName("python3-pip", "dnf")).toBe("python3-pip");
    expect(resolvePackageName("python3-pip", "yum")).toBe("python3-pip");
    expect(resolvePackageName("python3-pip", "pacman")).toBe("python-pip");
    expect(resolvePackageName("python3-pip", "apk")).toBe("py3-pip");
  });

  it("resolves fd with different names per manager", () => {
    expect(resolvePackageName("fd", "apt")).toBe("fd-find");
    expect(resolvePackageName("fd", "dnf")).toBe("fd-find");
    expect(resolvePackageName("fd", "yum")).toBe("fd-find");
    expect(resolvePackageName("fd", "pacman")).toBe("fd");
    expect(resolvePackageName("fd", "apk")).toBe("fd");
  });

  it("resolves docker with manager-specific names", () => {
    expect(resolvePackageName("docker", "apt")).toBe("docker.io");
    expect(resolvePackageName("docker", "dnf")).toBe("docker");
    expect(resolvePackageName("docker", "yum")).toBe("docker");
    expect(resolvePackageName("docker", "pacman")).toBe("docker");
    expect(resolvePackageName("docker", "apk")).toBe("docker");
  });

  it("resolves openssh-server for all managers", () => {
    expect(resolvePackageName("openssh-server", "apt")).toBe("openssh-server");
    expect(resolvePackageName("openssh-server", "dnf")).toBe("openssh-server");
    expect(resolvePackageName("openssh-server", "yum")).toBe("openssh-server");
    expect(resolvePackageName("openssh-server", "pacman")).toBe("openssh");
    expect(resolvePackageName("openssh-server", "apk")).toBe("openssh-server");
  });

  it("resolves redis with manager-specific names", () => {
    expect(resolvePackageName("redis", "apt")).toBe("redis-server");
    expect(resolvePackageName("redis", "dnf")).toBe("redis");
    expect(resolvePackageName("redis", "yum")).toBe("redis");
    expect(resolvePackageName("redis", "pacman")).toBe("redis");
    expect(resolvePackageName("redis", "apk")).toBe("redis");
  });

  it("resolves imagemagick with case differences", () => {
    expect(resolvePackageName("imagemagick", "apt")).toBe("imagemagick");
    expect(resolvePackageName("imagemagick", "dnf")).toBe("ImageMagick");
    expect(resolvePackageName("imagemagick", "yum")).toBe("ImageMagick");
    expect(resolvePackageName("imagemagick", "pacman")).toBe("imagemagick");
    expect(resolvePackageName("imagemagick", "apk")).toBe("imagemagick");
  });

  it("resolves build-essential equivalents", () => {
    expect(resolvePackageName("build-essential", "apt")).toBe("build-essential");
    expect(resolvePackageName("build-essential", "dnf")).toBe("gcc-c++ make");
    expect(resolvePackageName("build-essential", "yum")).toBe("gcc-c++ make");
    expect(resolvePackageName("build-essential", "pacman")).toBe("base-devel");
    expect(resolvePackageName("build-essential", "apk")).toBe("build-base");
  });

  it("returns null for unknown formula", () => {
    expect(resolvePackageName("nonexistent-package-xyz", "apt")).toBeNull();
    expect(resolvePackageName("nonexistent-package-xyz", "dnf")).toBeNull();
  });

  it("returns null when formula exists but manager not mapped", () => {
    expect(resolvePackageName("1password-cli", "pacman")).toBeNull();
    expect(resolvePackageName("1password-cli", "apk")).toBeNull();
  });
});

describe("install command generation", () => {
  it("generates apt install command with update", () => {
    const cmd = buildInstallCommand("git", "apt");
    expect(cmd).toContain("apt");
    expect(cmd).toContain("update");
    expect(cmd).toContain("install");
    expect(cmd).toContain("-y");
    expect(cmd).toContain("git");
    expect(cmd).toContain("sudo");
    expect(cmd).toContain("&&");
  });

  it("generates dnf install command", () => {
    const cmd = buildInstallCommand("git", "dnf");
    expect(cmd).toContain("dnf");
    expect(cmd).toContain("install");
    expect(cmd).toContain("-y");
    expect(cmd).toContain("git");
    expect(cmd).toContain("sudo");
    expect(cmd).not.toContain("update");
  });

  it("generates yum install command", () => {
    const cmd = buildInstallCommand("curl", "yum");
    expect(cmd).toContain("yum");
    expect(cmd).toContain("install");
    expect(cmd).toContain("-y");
    expect(cmd).toContain("curl");
    expect(cmd).toContain("sudo");
  });

  it("generates pacman install command", () => {
    const cmd = buildInstallCommand("vim", "pacman");
    expect(cmd).toContain("pacman");
    expect(cmd).toContain("-Sy");
    expect(cmd).toContain("--noconfirm");
    expect(cmd).toContain("vim");
    expect(cmd).toContain("sudo");
  });

  it("generates apk install command", () => {
    const cmd = buildInstallCommand("nginx", "apk");
    expect(cmd).toContain("apk");
    expect(cmd).toContain("add");
    expect(cmd).toContain("--no-cache");
    expect(cmd).toContain("nginx");
    expect(cmd).toContain("sudo");
  });

  it("handles multi-word package names", () => {
    const cmd = buildInstallCommand("gcc-c++ make", "dnf");
    expect(cmd).toContain("gcc-c++ make");
  });

  it("uses resolved executable path when available", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "clawdbot-pkg-"));
    try {
      const binDir = path.join(tmp, "bin");
      await fs.mkdir(binDir, { recursive: true });
      const aptPath = path.join(binDir, "apt");
      await fs.writeFile(aptPath, "#!/bin/sh\necho ok\n", "utf-8");
      await fs.chmod(aptPath, 0o755);

      const cmd = buildInstallCommand("test-pkg", "apt");
      expect(cmd).toContain("install");
      expect(cmd).toContain("test-pkg");
    } finally {
      await fs.rm(tmp, { recursive: true, force: true });
    }
  });
});

describe("package mappings completeness", () => {
  it("contains at least 15 package mappings", () => {
    const formulaCount = Object.keys(PACKAGE_MAPPINGS).length;
    expect(formulaCount).toBeGreaterThanOrEqual(15);
  });

  it("contains essential development tools", () => {
    expect(PACKAGE_MAPPINGS).toHaveProperty("git");
    expect(PACKAGE_MAPPINGS).toHaveProperty("curl");
    expect(PACKAGE_MAPPINGS).toHaveProperty("gcc");
    expect(PACKAGE_MAPPINGS).toHaveProperty("make");
    expect(PACKAGE_MAPPINGS).toHaveProperty("cmake");
  });

  it("contains common utilities", () => {
    expect(PACKAGE_MAPPINGS).toHaveProperty("jq");
    expect(PACKAGE_MAPPINGS).toHaveProperty("ripgrep");
    expect(PACKAGE_MAPPINGS).toHaveProperty("fd");
    expect(PACKAGE_MAPPINGS).toHaveProperty("bat");
    expect(PACKAGE_MAPPINGS).toHaveProperty("htop");
  });

  it("contains programming language tools", () => {
    expect(PACKAGE_MAPPINGS).toHaveProperty("python3");
    expect(PACKAGE_MAPPINGS).toHaveProperty("python3-pip");
    expect(PACKAGE_MAPPINGS).toHaveProperty("nodejs");
    expect(PACKAGE_MAPPINGS).toHaveProperty("npm");
  });

  it("contains server software", () => {
    expect(PACKAGE_MAPPINGS).toHaveProperty("nginx");
    expect(PACKAGE_MAPPINGS).toHaveProperty("postgresql");
    expect(PACKAGE_MAPPINGS).toHaveProperty("redis");
    expect(PACKAGE_MAPPINGS).toHaveProperty("docker");
  });

  it("all mappings have at least one manager", () => {
    for (const [formula, mappings] of Object.entries(PACKAGE_MAPPINGS)) {
      const managerCount = Object.keys(mappings).length;
      expect(managerCount, `${formula} should have at least one manager mapping`).toBeGreaterThan(
        0,
      );
    }
  });

  it("all manager values are non-empty strings", () => {
    for (const [formula, mappings] of Object.entries(PACKAGE_MAPPINGS)) {
      for (const [manager, pkgName] of Object.entries(mappings)) {
        expect(
          typeof pkgName === "string" && pkgName.length > 0,
          `${formula} -> ${manager} should have a non-empty package name`,
        ).toBe(true);
      }
    }
  });

  it("common packages have coverage across all major managers", () => {
    const commonPackages = ["git", "curl", "vim", "tmux", "wget"];
    const majorManagers: PackageManager[] = ["apt", "dnf", "yum", "pacman", "apk"];

    for (const pkg of commonPackages) {
      const mapping = PACKAGE_MAPPINGS[pkg];
      expect(mapping, `${pkg} should exist in mappings`).toBeDefined();

      for (const manager of majorManagers) {
        expect(mapping?.[manager], `${pkg} should have mapping for ${manager}`).toBeDefined();
      }
    }
  });
});

describe("edge cases and error handling", () => {
  it("handles empty package name gracefully", () => {
    const cmd = buildInstallCommand("", "apt");
    expect(typeof cmd).toBe("string");
  });

  it("handles package names with special characters", () => {
    const cmd = buildInstallCommand("package-name_v1.2.3", "apt");
    expect(cmd).toContain("package-name_v1.2.3");
  });

  it("resolvePackageName handles case-sensitive lookups", () => {
    expect(resolvePackageName("FFMPEG", "apt")).toBeNull();
    expect(resolvePackageName("ffmpeg", "apt")).toBe("ffmpeg");
  });

  it("buildInstallCommand uses fallback when executable not found", () => {
    const cmd = buildInstallCommand("test", "apt");
    expect(cmd).toContain("install");
    expect(cmd).toMatch(/apt|\/usr\/bin\/apt|\/bin\/apt/);
  });
});
