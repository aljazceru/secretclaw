---
summary: "CLI reference for `secretclaw reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `secretclaw reset`

Reset local config/state (keeps the CLI installed).

```bash
secretclaw reset
secretclaw reset --dry-run
secretclaw reset --scope config+creds+sessions --yes --non-interactive
```
