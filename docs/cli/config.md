---
summary: "CLI reference for `secretclaw config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `secretclaw config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `secretclaw configure`).

## Examples

```bash
secretclaw config get browser.executablePath
secretclaw config set browser.executablePath "/usr/bin/google-chrome"
secretclaw config set agents.defaults.heartbeat.every "2h"
secretclaw config set agents.list[0].tools.exec.node "node-id-or-name"
secretclaw config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
secretclaw config get agents.defaults.workspace
secretclaw config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
secretclaw config get agents.list
secretclaw config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--json` to require JSON5 parsing.

```bash
secretclaw config set agents.defaults.heartbeat.every "0m"
secretclaw config set gateway.port 19001 --json
secretclaw config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
