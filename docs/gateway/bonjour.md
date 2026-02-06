---
summary: "Bonjour/mDNS discovery + debugging (Gateway beacons, clients, and common failure modes)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Bonjour Discovery"
---

# Bonjour / mDNS discovery

SecretClaw uses Bonjour (mDNS / DNS‑SD) as a **LAN‑only convenience** to discover
an active Gateway (WebSocket endpoint). It is best‑effort and does **not** replace SSH or
Tailnet-based connectivity.

## Wide‑area Bonjour (Unicast DNS‑SD) over Tailscale

If the node and gateway are on different networks, multicast mDNS won’t cross the
boundary. You can keep the same discovery UX by switching to **unicast DNS‑SD**
("Wide‑Area Bonjour") over Tailscale.

High‑level steps:

1. Run a DNS server on the gateway host (reachable over Tailnet).
2. Publish DNS‑SD records for `_secretclaw-gw._tcp` under a dedicated zone
   (example: `secretclaw.internal.`).
3. Configure Tailscale **split DNS** so your chosen domain resolves via that
   DNS server for clients (including iOS).

SecretClaw supports any discovery domain; `secretclaw.internal.` is just an example.
iOS/Android nodes browse both `local.` and your configured wide‑area domain.

### Gateway config (recommended)

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### One‑time DNS server setup (gateway host)

```bash
secretclaw dns setup --apply
```

This installs CoreDNS and configures it to:

- listen on port 53 only on the gateway’s Tailscale interfaces
- serve your chosen domain (example: `secretclaw.internal.`) from `~/.secretclaw/dns/<domain>.db`

Validate from a tailnet‑connected machine:

```bash
dns-sd -B _secretclaw-gw._tcp secretclaw.internal.
dig @<TAILNET_IPV4> -p 53 _secretclaw-gw._tcp.secretclaw.internal PTR +short
```

### Tailscale DNS settings

In the Tailscale admin console:

- Add a nameserver pointing at the gateway’s tailnet IP (UDP/TCP 53).
- Add split DNS so your discovery domain uses that nameserver.

Once clients accept tailnet DNS, iOS nodes can browse
`_secretclaw-gw._tcp` in your discovery domain without multicast.

### Gateway listener security (recommended)

The Gateway WS port (default `18789`) binds to loopback by default. For LAN/tailnet
access, bind explicitly and keep auth enabled.

For tailnet‑only setups:

- Set `gateway.bind: "tailnet"` in `~/.secretclaw/secretclaw.json`.
- Restart the Gateway (or restart the macOS menubar app).

## What advertises

Only the Gateway advertises `_secretclaw-gw._tcp`.

## Service types

- `_secretclaw-gw._tcp` — gateway transport beacon (used by macOS/iOS/Android nodes).

## TXT keys (non‑secret hints)

The Gateway advertises small non‑secret hints to make UI flows convenient:

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (only when TLS is enabled)
- `gatewayTlsSha256=<sha256>` (only when TLS is enabled and fingerprint is available)
- `canvasPort=<port>` (only when the canvas host is enabled; default `18793`)
- `sshPort=<port>` (defaults to 22 when not overridden)
- `transport=gateway`
- `cliPath=<path>` (optional; absolute path to a runnable `secretclaw` entrypoint)
- `tailnetDns=<magicdns>` (optional hint when Tailnet is available)

## Debugging on macOS

Useful built‑in tools:

- Browse instances:
  ```bash
  dns-sd -B _secretclaw-gw._tcp local.
  ```
- Resolve one instance (replace `<instance>`):
  ```bash
  dns-sd -L "<instance>" _secretclaw-gw._tcp local.
  ```

If browsing works but resolving fails, you’re usually hitting a LAN policy or
mDNS resolver issue.

## Debugging in Gateway logs

The Gateway writes a rolling log file (printed on startup as
`gateway log file: ...`). Look for `bonjour:` lines, especially:

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## Debugging on iOS node

The iOS node uses `NWBrowser` to discover `_secretclaw-gw._tcp`.

To capture logs:

- Settings → Gateway → Advanced → **Discovery Debug Logs**
- Settings → Gateway → Advanced → **Discovery Logs** → reproduce → **Copy**

The log includes browser state transitions and result‑set changes.

## Common failure modes

- **Bonjour doesn’t cross networks**: use Tailnet or SSH.
- **Multicast blocked**: some Wi‑Fi networks disable mDNS.
- **Sleep / interface churn**: macOS may temporarily drop mDNS results; retry.
- **Browse works but resolve fails**: keep machine names simple (avoid emojis or
  punctuation), then restart the Gateway. The service instance name derives from
  the host name, so overly complex names can confuse some resolvers.

## Escaped instance names (`\032`)

Bonjour/DNS‑SD often escapes bytes in service instance names as decimal `\DDD`
sequences (e.g. spaces become `\032`).

- This is normal at the protocol level.
- UIs should decode for display (iOS uses `BonjourEscapes.decode`).

## Disabling / configuration

- `SECRETCLAW_DISABLE_BONJOUR=1` disables advertising (legacy: `SECRETCLAW_DISABLE_BONJOUR`).
- `gateway.bind` in `~/.secretclaw/secretclaw.json` controls the Gateway bind mode.
- `SECRETCLAW_SSH_PORT` overrides the SSH port advertised in TXT (legacy: `SECRETCLAW_SSH_PORT`).
- `SECRETCLAW_TAILNET_DNS` publishes a MagicDNS hint in TXT (legacy: `SECRETCLAW_TAILNET_DNS`).
- `SECRETCLAW_CLI_PATH` overrides the advertised CLI path (legacy: `SECRETCLAW_CLI_PATH`).

## Related docs

- Discovery policy and transport selection: [Discovery](/gateway/discovery)
- Node pairing + approvals: [Gateway pairing](/gateway/pairing)
