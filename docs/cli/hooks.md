---
summary: "CLI reference for `secretclaw hooks` (agent hooks)"
read_when:
  - You want to manage agent hooks
  - You want to install or update hooks
title: "hooks"
---

# `secretclaw hooks`

Manage agent hooks (event-driven automations for commands like `/new`, `/reset`, and gateway startup).

Related:

- Hooks: [Hooks](/hooks)
- Plugin hooks: [Plugins](/plugin#plugin-hooks)

## List All Hooks

```bash
secretclaw hooks list
```

List all discovered hooks from workspace, managed, and bundled directories.

**Options:**

- `--eligible`: Show only eligible hooks (requirements met)
- `--json`: Output as JSON
- `-v, --verbose`: Show detailed information including missing requirements

**Example output:**

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new command is issued
  😈 soul-evil ✓ - Swap injected SOUL content during a purge window or by random chance
```

**Example (verbose):**

```bash
secretclaw hooks list --verbose
```

Shows missing requirements for ineligible hooks.

**Example (JSON):**

```bash
secretclaw hooks list --json
```

Returns structured JSON for programmatic use.

## Get Hook Information

```bash
secretclaw hooks info <name>
```

Show detailed information about a specific hook.

**Arguments:**

- `<name>`: Hook name (e.g., `session-memory`)

**Options:**

- `--json`: Output as JSON

**Example:**

```bash
secretclaw hooks info session-memory
```

**Output:**

```
💾 session-memory ✓ Ready

Save session context to memory when /new command is issued

Details:
  Source: secretclaw-bundled
  Path: /path/to/secretclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/secretclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/hooks#session-memory
  Events: command:new

Requirements:
  Config: ✓ workspace.dir
```

## Check Hooks Eligibility

```bash
secretclaw hooks check
```

Show summary of hook eligibility status (how many are ready vs. not ready).

**Options:**

- `--json`: Output as JSON

**Example output:**

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0
```

## Enable a Hook

```bash
secretclaw hooks enable <name>
```

Enable a specific hook by adding it to your config (`~/.secretclaw/config.json`).

**Note:** Hooks managed by plugins show `plugin:<id>` in `secretclaw hooks list` and
can’t be enabled/disabled here. Enable/disable the plugin instead.

**Arguments:**

- `<name>`: Hook name (e.g., `session-memory`)

**Example:**

```bash
secretclaw hooks enable session-memory
```

**Output:**

```
✓ Enabled hook: 💾 session-memory
```

**What it does:**

- Checks if hook exists and is eligible
- Updates `hooks.internal.entries.<name>.enabled = true` in your config
- Saves config to disk

**After enabling:**

- Restart the gateway so hooks reload (menu bar app restart on macOS, or restart your gateway process in dev).

## Disable a Hook

```bash
secretclaw hooks disable <name>
```

Disable a specific hook by updating your config.

**Arguments:**

- `<name>`: Hook name (e.g., `command-logger`)

**Example:**

```bash
secretclaw hooks disable command-logger
```

**Output:**

```
⏸ Disabled hook: 📝 command-logger
```

**After disabling:**

- Restart the gateway so hooks reload

## Install Hooks

```bash
secretclaw hooks install <path-or-spec>
```

Install a hook pack from a local folder/archive or npm.

**What it does:**

- Copies the hook pack into `~/.secretclaw/hooks/<id>`
- Enables the installed hooks in `hooks.internal.entries.*`
- Records the install under `hooks.internal.installs`

**Options:**

- `-l, --link`: Link a local directory instead of copying (adds it to `hooks.internal.load.extraDirs`)

**Supported archives:** `.zip`, `.tgz`, `.tar.gz`, `.tar`

**Examples:**

```bash
# Local directory
secretclaw hooks install ./my-hook-pack

# Local archive
secretclaw hooks install ./my-hook-pack.zip

# NPM package
secretclaw hooks install @secretclaw/my-hook-pack

# Link a local directory without copying
secretclaw hooks install -l ./my-hook-pack
```

## Update Hooks

```bash
secretclaw hooks update <id>
secretclaw hooks update --all
```

Update installed hook packs (npm installs only).

**Options:**

- `--all`: Update all tracked hook packs
- `--dry-run`: Show what would change without writing

## Bundled Hooks

### session-memory

Saves session context to memory when you issue `/new`.

**Enable:**

```bash
secretclaw hooks enable session-memory
```

**Output:** `~/.secretclaw/workspace/memory/YYYY-MM-DD-slug.md`

**See:** [session-memory documentation](/hooks#session-memory)

### command-logger

Logs all command events to a centralized audit file.

**Enable:**

```bash
secretclaw hooks enable command-logger
```

**Output:** `~/.secretclaw/logs/commands.log`

**View logs:**

```bash
# Recent commands
tail -n 20 ~/.secretclaw/logs/commands.log

# Pretty-print
cat ~/.secretclaw/logs/commands.log | jq .

# Filter by action
grep '"action":"new"' ~/.secretclaw/logs/commands.log | jq .
```

**See:** [command-logger documentation](/hooks#command-logger)

### soul-evil

Swaps injected `SOUL.md` content with `SOUL_EVIL.md` during a purge window or by random chance.

**Enable:**

```bash
secretclaw hooks enable soul-evil
```

**See:** [SOUL Evil Hook](/hooks/soul-evil)

### boot-md

Runs `BOOT.md` when the gateway starts (after channels start).

**Events**: `gateway:startup`

**Enable**:

```bash
secretclaw hooks enable boot-md
```

**See:** [boot-md documentation](/hooks#boot-md)
