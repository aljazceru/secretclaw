import { describe, it, expect, vi, afterEach } from "vitest";
import type { SkillInstallSpec, SkillsInstallPreferences } from "./skills.js";
import * as pkg from "../infra/pkg.js";

describe("skills-install system package manager integration", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function buildInstallCommandHelper(
    spec: SkillInstallSpec,
    prefs: SkillsInstallPreferences,
  ): {
    argv: string[] | null;
    error?: string;
  } {
    switch (spec.kind) {
      case "system": {
        if (!spec.package && !spec.formula) {
          return { argv: null, error: "missing package name" };
        }

        const pkgManager = pkg.detectPackageManager();
        if (!pkgManager) {
          return { argv: null, error: "no system package manager found" };
        }

        const packageName = spec.package ?? spec.formula!;
        const mappedName = pkg.resolvePackageName(packageName, pkgManager);

        if (!mappedName) {
          return {
            argv: null,
            error: `package ${packageName} not available for ${pkgManager}`,
          };
        }

        const command = pkg.buildInstallCommand(mappedName, pkgManager);
        return { argv: ["sh", "-c", command] };
      }
      case "brew": {
        if (!spec.formula) return { argv: null, error: "missing brew formula" };

        if (prefs.preferSystem) {
          const pkgManager = pkg.detectPackageManager();
          if (pkgManager) {
            const mappedName = pkg.resolvePackageName(spec.formula, pkgManager);
            if (mappedName) {
              const command = pkg.buildInstallCommand(mappedName, pkgManager);
              return { argv: ["sh", "-c", command] };
            }
          }
        }

        return { argv: ["brew", "install", spec.formula] };
      }
      default:
        return { argv: null, error: "unsupported installer" };
    }
  }

  describe("system kind", () => {
    it("should detect apt and build install command for ffmpeg", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("apt");

      const spec: SkillInstallSpec = {
        kind: "system",
        package: "ffmpeg",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual([
        "sh",
        "-c",
        "sudo /usr/bin/apt update && sudo /usr/bin/apt install -y ffmpeg",
      ]);
      expect(result.error).toBeUndefined();
    });

    it("should detect dnf and build install command for git", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("dnf");

      const spec: SkillInstallSpec = {
        kind: "system",
        formula: "git",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual(["sh", "-c", "sudo dnf install -y git"]);
      expect(result.error).toBeUndefined();
    });

    it("should handle package name mappings correctly (fd)", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("apt");

      const spec: SkillInstallSpec = {
        kind: "system",
        formula: "fd",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual([
        "sh",
        "-c",
        "sudo /usr/bin/apt update && sudo /usr/bin/apt install -y fd-find",
      ]);
      expect(result.error).toBeUndefined();
    });

    it("should return error when no package manager found", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue(null);

      const spec: SkillInstallSpec = {
        kind: "system",
        package: "ffmpeg",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toBeNull();
      expect(result.error).toBe("no system package manager found");
    });

    it("should return error when package not in mapping", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("apt");
      vi.spyOn(pkg, "resolvePackageName").mockReturnValue(null);

      const spec: SkillInstallSpec = {
        kind: "system",
        package: "unknown-package",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toBeNull();
      expect(result.error).toBe("package unknown-package not available for apt");
    });

    it("should return error when missing package name", () => {
      const spec: SkillInstallSpec = {
        kind: "system",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toBeNull();
      expect(result.error).toBe("missing package name");
    });
  });

  describe("brew kind with preferSystem", () => {
    it("should use system package manager when preferSystem=true and package available", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("apt");

      const spec: SkillInstallSpec = {
        kind: "brew",
        formula: "ffmpeg",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: true,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual([
        "sh",
        "-c",
        "sudo /usr/bin/apt update && sudo /usr/bin/apt install -y ffmpeg",
      ]);
      expect(result.error).toBeUndefined();
    });

    it("should fall back to brew when preferSystem=true but package not in mapping", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("apt");
      vi.spyOn(pkg, "resolvePackageName").mockReturnValue(null);

      const spec: SkillInstallSpec = {
        kind: "brew",
        formula: "some-brew-only-formula",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: true,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual(["brew", "install", "some-brew-only-formula"]);
      expect(result.error).toBeUndefined();
    });

    it("should fall back to brew when preferSystem=true but no system package manager", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue(null);

      const spec: SkillInstallSpec = {
        kind: "brew",
        formula: "ffmpeg",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: true,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual(["brew", "install", "ffmpeg"]);
      expect(result.error).toBeUndefined();
    });

    it("should use brew directly when preferSystem=false", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("apt");

      const spec: SkillInstallSpec = {
        kind: "brew",
        formula: "ffmpeg",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: true,
        nodeManager: "npm",
        preferSystem: false,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual(["brew", "install", "ffmpeg"]);
      expect(result.error).toBeUndefined();
    });
  });

  describe("package name resolution", () => {
    it("should resolve docker package name correctly for apt", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("apt");

      const spec: SkillInstallSpec = {
        kind: "system",
        formula: "docker",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual([
        "sh",
        "-c",
        "sudo /usr/bin/apt update && sudo /usr/bin/apt install -y docker.io",
      ]);
    });

    it("should resolve docker package name correctly for dnf", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("dnf");

      const spec: SkillInstallSpec = {
        kind: "system",
        formula: "docker",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual(["sh", "-c", "sudo dnf install -y docker"]);
    });

    it("should use spec.package over spec.formula when both provided", () => {
      vi.spyOn(pkg, "detectPackageManager").mockReturnValue("apt");

      const spec: SkillInstallSpec = {
        kind: "system",
        package: "git",
        formula: "ffmpeg",
      };

      const prefs: SkillsInstallPreferences = {
        preferBrew: false,
        nodeManager: "npm",
        preferSystem: true,
      };

      const result = buildInstallCommandHelper(spec, prefs);

      expect(result.argv).toEqual([
        "sh",
        "-c",
        "sudo /usr/bin/apt update && sudo /usr/bin/apt install -y git",
      ]);
    });
  });
});
