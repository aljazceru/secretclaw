import { execSync } from "node:child_process";
import fs from "node:fs";

/**
 * Supported Linux package managers.
 */
export type PackageManager = "apt" | "dnf" | "yum" | "pacman" | "apk";

/**
 * Check if a file path is executable.
 */
function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a command exists in the system PATH.
 */
function commandExists(command: string): boolean {
  try {
    execSync(`command -v ${command}`, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 2000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-detect the available package manager on the system.
 * Checks in priority order: apt, dnf, yum, pacman, apk.
 *
 * @returns The detected package manager or null if none found
 */
export function detectPackageManager(): PackageManager | null {
  const managers: PackageManager[] = ["apt", "dnf", "yum", "pacman", "apk"];

  for (const manager of managers) {
    if (commandExists(manager)) {
      return manager;
    }
  }

  return null;
}

/**
 * Find the full path to a package manager executable.
 *
 * @param manager - Optional specific package manager to resolve. If not provided, auto-detects.
 * @returns The full path to the package manager binary or null if not found
 */
export function resolvePkgExecutable(manager?: PackageManager): string | null {
  const targetManager = manager ?? detectPackageManager();
  if (!targetManager) return null;

  const commonPaths = [
    `/usr/bin/${targetManager}`,
    `/bin/${targetManager}`,
    `/usr/local/bin/${targetManager}`,
    `/sbin/${targetManager}`,
    `/usr/sbin/${targetManager}`,
  ];

  for (const candidate of commonPaths) {
    if (isExecutable(candidate)) return candidate;
  }

  try {
    const result = execSync(`which ${targetManager}`, {
      encoding: "utf-8",
      stdio: "pipe",
      timeout: 2000,
    });
    const trimmed = result.trim();
    if (trimmed && isExecutable(trimmed)) return trimmed;
  } catch {
    // which failed, continue
  }

  return null;
}

/**
 * Comprehensive package name mappings from Homebrew formula names to Linux package names.
 * Maps: formula -> { apt?, dnf?, yum?, pacman?, apk? }
 */
export const PACKAGE_MAPPINGS: Record<string, Partial<Record<PackageManager, string>>> = {
  ffmpeg: {
    apt: "ffmpeg",
    dnf: "ffmpeg",
    yum: "ffmpeg",
    pacman: "ffmpeg",
    apk: "ffmpeg",
  },
  git: {
    apt: "git",
    dnf: "git",
    yum: "git",
    pacman: "git",
    apk: "git",
  },
  curl: {
    apt: "curl",
    dnf: "curl",
    yum: "curl",
    pacman: "curl",
    apk: "curl",
  },
  python3: {
    apt: "python3",
    dnf: "python3",
    yum: "python3",
    pacman: "python",
    apk: "python3",
  },
  "python3-pip": {
    apt: "python3-pip",
    dnf: "python3-pip",
    yum: "python3-pip",
    pacman: "python-pip",
    apk: "py3-pip",
  },
  "1password-cli": {
    apt: "1password-cli",
    dnf: "1password-cli",
    yum: "1password-cli",
  },
  jq: {
    apt: "jq",
    dnf: "jq",
    yum: "jq",
    pacman: "jq",
    apk: "jq",
  },
  ripgrep: {
    apt: "ripgrep",
    dnf: "ripgrep",
    yum: "ripgrep",
    pacman: "ripgrep",
    apk: "ripgrep",
  },
  fd: {
    apt: "fd-find",
    dnf: "fd-find",
    yum: "fd-find",
    pacman: "fd",
    apk: "fd",
  },
  bat: {
    apt: "bat",
    dnf: "bat",
    yum: "bat",
    pacman: "bat",
    apk: "bat",
  },
  nodejs: {
    apt: "nodejs",
    dnf: "nodejs",
    yum: "nodejs",
    pacman: "nodejs",
    apk: "nodejs",
  },
  npm: {
    apt: "npm",
    dnf: "npm",
    yum: "npm",
    pacman: "npm",
    apk: "npm",
  },
  docker: {
    apt: "docker.io",
    dnf: "docker",
    yum: "docker",
    pacman: "docker",
    apk: "docker",
  },
  "docker-compose": {
    apt: "docker-compose",
    dnf: "docker-compose",
    yum: "docker-compose",
    pacman: "docker-compose",
    apk: "docker-compose",
  },
  vim: {
    apt: "vim",
    dnf: "vim",
    yum: "vim",
    pacman: "vim",
    apk: "vim",
  },
  neovim: {
    apt: "neovim",
    dnf: "neovim",
    yum: "neovim",
    pacman: "neovim",
    apk: "neovim",
  },
  tmux: {
    apt: "tmux",
    dnf: "tmux",
    yum: "tmux",
    pacman: "tmux",
    apk: "tmux",
  },
  htop: {
    apt: "htop",
    dnf: "htop",
    yum: "htop",
    pacman: "htop",
    apk: "htop",
  },
  wget: {
    apt: "wget",
    dnf: "wget",
    yum: "wget",
    pacman: "wget",
    apk: "wget",
  },
  rsync: {
    apt: "rsync",
    dnf: "rsync",
    yum: "rsync",
    pacman: "rsync",
    apk: "rsync",
  },
  openssh: {
    apt: "openssh-client",
    dnf: "openssh",
    yum: "openssh",
    pacman: "openssh",
    apk: "openssh",
  },
  "openssh-server": {
    apt: "openssh-server",
    dnf: "openssh-server",
    yum: "openssh-server",
    pacman: "openssh",
    apk: "openssh-server",
  },
  zsh: {
    apt: "zsh",
    dnf: "zsh",
    yum: "zsh",
    pacman: "zsh",
    apk: "zsh",
  },
  fish: {
    apt: "fish",
    dnf: "fish",
    yum: "fish",
    pacman: "fish",
    apk: "fish",
  },
  gcc: {
    apt: "gcc",
    dnf: "gcc",
    yum: "gcc",
    pacman: "gcc",
    apk: "gcc",
  },
  make: {
    apt: "make",
    dnf: "make",
    yum: "make",
    pacman: "make",
    apk: "make",
  },
  cmake: {
    apt: "cmake",
    dnf: "cmake",
    yum: "cmake",
    pacman: "cmake",
    apk: "cmake",
  },
  imagemagick: {
    apt: "imagemagick",
    dnf: "ImageMagick",
    yum: "ImageMagick",
    pacman: "imagemagick",
    apk: "imagemagick",
  },
  sqlite: {
    apt: "sqlite3",
    dnf: "sqlite",
    yum: "sqlite",
    pacman: "sqlite",
    apk: "sqlite",
  },
  postgresql: {
    apt: "postgresql",
    dnf: "postgresql",
    yum: "postgresql",
    pacman: "postgresql",
    apk: "postgresql",
  },
  redis: {
    apt: "redis-server",
    dnf: "redis",
    yum: "redis",
    pacman: "redis",
    apk: "redis",
  },
  nginx: {
    apt: "nginx",
    dnf: "nginx",
    yum: "nginx",
    pacman: "nginx",
    apk: "nginx",
  },
  "build-essential": {
    apt: "build-essential",
    dnf: "gcc-c++ make",
    yum: "gcc-c++ make",
    pacman: "base-devel",
    apk: "build-base",
  },
  tree: {
    apt: "tree",
    dnf: "tree",
    yum: "tree",
    pacman: "tree",
    apk: "tree",
  },
  unzip: {
    apt: "unzip",
    dnf: "unzip",
    yum: "unzip",
    pacman: "unzip",
    apk: "unzip",
  },
  zip: {
    apt: "zip",
    dnf: "zip",
    yum: "zip",
    pacman: "zip",
    apk: "zip",
  },
  "ca-certificates": {
    apt: "ca-certificates",
    dnf: "ca-certificates",
    yum: "ca-certificates",
    pacman: "ca-certificates",
    apk: "ca-certificates",
  },
  himalaya: {
    pacman: "himalaya",
  },
  uv: {
    pacman: "python-uv",
  },
};

/**
 * Resolve the package name for a specific package manager.
 * Given a Homebrew formula name, returns the corresponding package name
 * for the target package manager.
 *
 * @param formula - The Homebrew formula name
 * @param manager - The target package manager
 * @returns The package name for the manager, or null if no mapping exists
 */
export function resolvePackageName(formula: string, manager: PackageManager): string | null {
  const mapping = PACKAGE_MAPPINGS[formula];
  if (!mapping) return null;

  const pkgName = mapping[manager];
  return pkgName ?? null;
}

/**
 * Build a complete install command for a package manager.
 * Includes sudo and package manager-specific update commands when needed.
 *
 * @param packageName - The package name to install
 * @param manager - The package manager to use
 * @returns The complete install command string
 */
export function buildInstallCommand(packageName: string, manager: PackageManager): string {
  const pkgPath = resolvePkgExecutable(manager);
  const cmd = pkgPath ?? manager;

  switch (manager) {
    case "apt":
      return `sudo ${cmd} update && sudo ${cmd} install -y ${packageName}`;
    case "dnf":
      return `sudo ${cmd} install -y ${packageName}`;
    case "yum":
      return `sudo ${cmd} install -y ${packageName}`;
    case "pacman":
      return `sudo ${cmd} -Sy --noconfirm ${packageName}`;
    case "apk":
      return `sudo ${cmd} add --no-cache ${packageName}`;
    default: {
      const _exhaustive: never = manager;
      throw new Error(`Unsupported package manager: ${String(_exhaustive)}`);
    }
  }
}
