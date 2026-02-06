---
summary: "CLI reference for `secretclaw logs` (tail gateway logs via RPC)"
read_when:
  - You need to tail Gateway logs remotely (without SSH)
  - You want JSON log lines for tooling
title: "logs"
---

# `secretclaw logs`

Tail Gateway file logs over RPC (works in remote mode).

Related:

- Logging overview: [Logging](/logging)

## Examples

```bash
secretclaw logs
secretclaw logs --follow
secretclaw logs --json
secretclaw logs --limit 500
```
