---
summary: "CLI reference for `secretclaw voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `secretclaw voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
secretclaw voicecall status --call-id <id>
secretclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
secretclaw voicecall continue --call-id <id> --message "Any questions?"
secretclaw voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
secretclaw voicecall expose --mode serve
secretclaw voicecall expose --mode funnel
secretclaw voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
