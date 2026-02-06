---
summary: "CLI reference for `secretclaw status` (diagnostics, probes, usage snapshots)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `secretclaw status`

Diagnostics for channels + sessions.

```bash
secretclaw status
secretclaw status --all
secretclaw status --deep
secretclaw status --usage
```

Notes:

- `--deep` runs live probes (WhatsApp Web + Telegram + Discord + Google Chat + Slack + Signal).
- Output includes per-agent session stores when multiple agents are configured.
- Overview includes Gateway + node host service install/runtime status when available.
- Overview includes update channel + git SHA (for source checkouts).
- Update info surfaces in the Overview; if an update is available, status prints a hint to run `secretclaw update` (see [Updating](/install/updating)).
