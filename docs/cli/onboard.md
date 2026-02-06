---
summary: "CLI reference for `secretclaw onboard` (interactive onboarding wizard)"
read_when:
  - You want guided setup for gateway, workspace, auth, channels, and skills
title: "onboard"
---

# `secretclaw onboard`

Interactive onboarding wizard (local or remote Gateway setup).

Related:

- Wizard guide: [Onboarding](/start/onboarding)

## Examples

```bash
secretclaw onboard
secretclaw onboard --flow quickstart
secretclaw onboard --flow manual
secretclaw onboard --mode remote --remote-url ws://gateway-host:18789
```

Flow notes:

- `quickstart`: minimal prompts, auto-generates a gateway token.
- `manual`: full prompts for port/bind/auth (alias of `advanced`).
- Fastest first chat: `secretclaw dashboard` (Control UI, no channel setup).
