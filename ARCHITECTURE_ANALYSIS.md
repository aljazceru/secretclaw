# Clawdbot Architecture Analysis

## Executive Summary

**Clawdbot** is a sophisticated personal AI assistant platform built as a multi-channel messaging gateway with embedded AI agent capabilities. The architecture centers around a WebSocket-based **Gateway** control plane that coordinates messaging channels, AI agents, mobile/desktop nodes, and automation workflows.

**Scale**: ~1,600 TypeScript source files, ~283K lines of code
**Primary Language**: TypeScript (ESM), with Swift for native apps
**Runtime**: Node.js 22+, with Bun support for development

---

## 1. Core Architectural Patterns

### 1.1 Gateway-Centric Control Plane

```
┌─────────────────────────────────────────────────────────────┐
│                    MESSAGING CHANNELS                        │
│  WhatsApp │ Telegram │ Discord │ Slack │ Signal │ iMessage  │
│  Teams │ Matrix │ Zalo │ Google Chat │ BlueBubbles │ LINE   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  GATEWAY (Control Plane)                     │
│              WebSocket Server (127.0.0.1:18789)             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ • Session Management    • Event Broadcasting         │   │
│  │ • Agent Routing         • Health/Presence           │   │
│  │ • Config Hot-Reload     • Cron/Webhooks             │   │
│  │ • Plugin Registry       • Auth/Pairing              │   │
│  │ • Node Registry         • TLS/Tailscale             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Pi Agent   │  │   CLI Tools  │  │    Nodes     │
│  (RPC Mode)  │  │              │  │ (iOS/Android/│
│              │  │ • send       │  │   macOS)     │
│ • Tools      │  │ • agent      │  │              │
│ • Streaming  │  │ • gateway    │  │ • Canvas     │
│ • Sessions   │  │ • config     │  │ • Camera     │
└──────────────┘  └──────────────┘  │ • Screen     │
                                     │ • Location   │
                                     └──────────────┘
```

**Key Principle**: Single source of truth. The Gateway is the only component that:
- Opens messaging channel connections (e.g., one WhatsApp Baileys session per host)
- Maintains session state and conversation history
- Coordinates agent runs and tool invocations
- Broadcasts events to all connected clients

**Implementation**: `/home/user/clawdbot/src/gateway/server.impl.ts` (585 lines)

---

## 2. Key Building Blocks

### 2.1 Plugin System

**Two-Tier Plugin Architecture**:

1. **Channel Plugins** (`src/channels/plugins/*.ts`):
   - Adapter pattern for messaging platforms
   - Each implements `ChannelPlugin<ResolvedAccount>` interface
   - Capabilities: auth, pairing, outbound, status, gateway methods, streaming, threading

2. **Gateway Plugins** (`extensions/*`):
   - Workspace-based npm packages
   - Can extend channel support, add services, or provide tools
   - Loaded via jiti with isolated dependencies

**Channel Plugin Interface** (`src/channels/plugins/types.plugin.ts`):
```typescript
export type ChannelPlugin<ResolvedAccount = any> = {
  id: ChannelId;
  meta: ChannelMeta;
  capabilities: ChannelCapabilities;
  onboarding?: ChannelOnboardingAdapter;
  config: ChannelConfigAdapter<ResolvedAccount>;
  configSchema?: ChannelConfigSchema;
  setup?: ChannelSetupAdapter;
  pairing?: ChannelPairingAdapter;
  security?: ChannelSecurityAdapter<ResolvedAccount>;
  groups?: ChannelGroupAdapter;
  outbound?: ChannelOutboundAdapter;
  gateway?: ChannelGatewayAdapter<ResolvedAccount>;
  auth?: ChannelAuthAdapter;
  streaming?: ChannelStreamingAdapter;
  threading?: ChannelThreadingAdapter;
  agentTools?: ChannelAgentToolFactory | ChannelAgentTool[];
  // ... 15+ adapter types
};
```

**Plugin SDK**: Comprehensive exports at `/home/user/clawdbot/src/plugin-sdk/index.ts` (367 lines)

### 2.2 Agent System (Pi Integration)

**Architecture**:
- Built on `@mariozechner/pi-agent-core` (Pi agent runtime)
- Runs in **RPC mode** via WebSocket or embedded in CLI
- Tool streaming with block streaming for real-time output
- Multi-agent routing with isolated workspaces

**Key Files**:
- `src/agents/pi-embedded.ts` - Embedded Pi agent runner
- `src/agents/cli-runner.ts` - CLI agent execution
- `src/agents/model-fallback.ts` - Provider failover logic
- `src/agents/skills.ts` - Skills platform integration

**Session Model**:
```typescript
// Session Key Format: agent:account:channel:peer
// Examples:
//   "main:default:whatsapp:main"           // Main direct chat
//   "main:default:telegram:group:123456"   // Group chat
//   "assistant:alice:discord:dm:alice#0001" // Custom agent routing
```

**Model Support**:
- Anthropic (Claude): Opus 4.5, Sonnet, Haiku
- OpenAI: GPT-4, GPT-3.5
- Google: Gemini Pro/Flash
- GitHub Copilot: via proxy
- Local models: via node-llama-cpp (optional)

### 2.3 Routing & Session Management

**Multi-Agent Routing** (`src/routing/resolve-route.ts`):

Bindings allow routing different channels/accounts/peers to isolated agents:
```typescript
export function resolveAgentRoute(input: {
  cfg: ClawdbotConfig;
  channel: string;
  accountId?: string | null;
  peer?: RoutePeer | null;
  guildId?: string | null;
  teamId?: string | null;
}): ResolvedAgentRoute {
  // Match priority:
  // 1. Peer-specific binding
  // 2. Guild/Team binding
  // 3. Account binding
  // 4. Channel wildcard
  // 5. Default agent
}
```

**Session Isolation**:
- Each session has independent conversation history
- DM scope: `main` (collapse all DMs), `per-peer`, `per-channel-peer`
- Group isolation: each group gets separate session
- Identity linking: cross-channel identity mapping

### 2.4 Configuration System

**Tech Stack**:
- **Storage**: YAML or JSON5 files (`~/.clawdbot/config.yaml`)
- **Validation**: Zod schemas with runtime validation
- **Hot-Reload**: File watcher with selective reload or full restart
- **Migration**: Automatic legacy config migration via `doctor` command

**Key Files**:
- `src/config/config.ts` - Config IO and loading
- `src/config/zod-schema.ts` - Master Zod schema
- `src/config/types.ts` - TypeScript types
- `src/gateway/config-reload.ts` - Hot-reload orchestration

**Configuration Scope**:
```yaml
gateway:
  port: 18789
  bind: loopback|lan|tailnet
  auth:
    token: "..."
  controlUi:
    enabled: true

channels:
  whatsapp:
    allowFrom: ["+1234567890"]
  telegram:
    botToken: "..."

agents:
  defaults:
    workspace: "~/.clawdbot/workspace"
  list:
    - id: main
      workspace: "~/.clawdbot/workspace"

session:
  dmScope: main
  identityLinks:
    alice: ["whatsapp:+1234", "telegram:alice_tg"]
```

---

## 3. Integration Points

### 3.1 Channel Integration Pattern

**Channel Lifecycle**:
```
┌──────────────────────────────────────────────────────────┐
│                  Channel Start Flow                       │
└──────────────────────────────────────────────────────────┘
  1. Config validation (Zod schema)
  2. Account resolution (multi-account support)
  3. Auth/login (QR, token, OAuth)
  4. Monitor setup (message handlers)
  5. Gateway method registration
  6. Event broadcasting setup
```

**Inbound Message Flow**:
```typescript
// Simplified flow (actual: src/auto-reply/reply/get-reply.ts)
Channel Monitor
  │
  ├─> Parse message (text, media, reactions, polls)
  ├─> Resolve routing (agent, session key)
  ├─> Security check (allowlist, pairing, DM policy)
  ├─> Extract directives (@think, @verbose, @exec)
  ├─> Queue or immediate processing
  │
  └─> Gateway Event: "inbound"
       │
       └─> Agent runner
            ├─> Build context (history, attachments)
            ├─> Tool injection (channel-specific tools)
            ├─> Stream to Pi agent (RPC)
            └─> Reply chunks back to channel
```

**Channel Registry** (`src/channels/registry.ts`):
- Ordered list: WhatsApp, Telegram, Discord, Slack, Signal, iMessage, BlueBubbles, Teams, etc.
- Metadata: display names, icons, capabilities
- Used by CLI and UI for consistent ordering

### 3.2 Node Communication (Canvas, Camera, Screen)

**Node Protocol**:
- WebSocket connection with `role: "node"`
- Device pairing (approval required for remote nodes)
- Command invocation via Gateway methods
- Event subscriptions for state sync

**Node Commands**:
```typescript
// Examples from src/gateway/node-command-policy.ts
canvas.push      // Update Canvas UI
canvas.reset     // Clear Canvas
canvas.snapshot  // Capture screenshot
camera.snap      // Take photo
camera.clip      // Record video
screen.record    // Screen recording
location.get     // GPS coordinates
system.notify    // macOS notification
system.run       // Execute shell command (macOS only)
```

**Implementation**:
- iOS: Swift app (`apps/ios/`)
- Android: Kotlin app (`apps/android/`)
- macOS: SwiftUI app (`apps/macos/`) + node mode

### 3.3 Browser Control

**Dedicated Browser Instance**:
- Chrome/Chromium managed by Gateway
- CDP (Chrome DevTools Protocol) control
- Profile isolation for security
- Persistent state across sessions

**Capabilities** (`src/browser/*.ts`):
- Navigation and automation
- Screenshot capture
- Element inspection
- Form filling and clicks
- Cookie/localStorage management

### 3.4 Canvas + A2UI

**Two-Layer System**:
1. **Canvas Host** (port 18793): HTML/CSS/JS workspace
2. **A2UI** (Agent-to-UI): Declarative UI framework

**A2UI Rendering**:
- Agent generates A2UI JSON
- Runtime renders to HTML/Canvas
- Supports: forms, charts, tables, buttons, media
- Bidirectional: UI events → agent tools

**Files**:
- `src/canvas-host/` - Canvas HTTP server
- `src/canvas-host/a2ui/` - A2UI runtime bundle

---

## 4. Design Patterns

### 4.1 Dependency Injection

**Pattern**: Factory-based DI for testability

```typescript
// src/cli/deps.ts
export type CliDeps = {
  sendMessageWhatsApp: typeof sendMessageWhatsApp;
  sendMessageTelegram: typeof sendMessageTelegram;
  sendMessageDiscord: typeof sendMessageDiscord;
  // ... more providers
};

export function createDefaultDeps(): CliDeps {
  return {
    sendMessageWhatsApp,
    sendMessageTelegram,
    sendMessageDiscord,
    // Real implementations
  };
}

// In tests:
const mockDeps = createDefaultDeps();
mockDeps.sendMessageWhatsApp = vi.fn();
```

### 4.2 Adapter Pattern

**Channel Adapters**:
- Each channel implements subset of adapter interfaces
- Fallback to defaults when adapter not provided
- Enables channel-agnostic code in core

**Example** (`src/channels/plugins/whatsapp.ts`):
```typescript
export const whatsappPlugin: ChannelPlugin<ResolvedWhatsAppAccount> = {
  id: "whatsapp",
  meta: { /* ... */ },
  capabilities: { chatTypes: ["direct", "group"], reactions: true },
  config: { /* ... */ },
  auth: { /* QR login */ },
  outbound: { /* send messages */ },
  security: { /* DM policy */ },
  // ... more adapters
};
```

### 4.3 Event-Driven Architecture

**Event System**:
- Central event bus in Gateway
- Typed events with Zod schemas
- Clients subscribe via WebSocket
- Broadcast with drop-if-slow policy for non-critical events

**Event Types** (`src/gateway/server-methods-list.ts`):
```typescript
export const GATEWAY_EVENTS = [
  "tick",           // Periodic heartbeat
  "presence",       // Online/away status
  "agent",          // Agent run updates
  "chat",           // Chat deltas
  "health",         // System health
  "heartbeat",      // Custom heartbeats
  "cron",           // Cron job triggers
  "shutdown",       // Gateway stopping
  "voicewake.changed",
  // ... more
];
```

### 4.4 Factory Pattern

**Model Catalog**:
```typescript
// src/agents/model-catalog.ts
export function loadModelCatalog(cfg: ClawdbotConfig) {
  return {
    providers: [
      { id: "anthropic", models: [...] },
      { id: "openai", models: [...] },
      { id: "gemini", models: [...] },
    ],
    resolve: (provider, model) => { /* ... */ },
  };
}
```

### 4.5 Strategy Pattern

**Model Failover**:
```typescript
// src/agents/model-fallback.ts
export async function runWithModelFallback<T>(opts: {
  primary: ModelRef;
  fallbacks: ModelRef[];
  run: (model: ModelRef) => Promise<T>;
}): Promise<T> {
  const attempts = [opts.primary, ...opts.fallbacks];
  for (const model of attempts) {
    try {
      return await opts.run(model);
    } catch (err) {
      // Log and try next
    }
  }
  throw new Error("All models failed");
}
```

---

## 5. Tech Stack

### 5.1 Core Framework

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Language** | TypeScript 5.9 (strict mode, ESM) | Type safety, modern JS |
| **Runtime** | Node.js 22+ | Server runtime |
| **Dev Runtime** | Bun | Fast TS execution, tests |
| **Build** | tsc (TypeScript compiler) | Type checking + JS output |
| **Package Manager** | pnpm (workspace mode) | Monorepo, fast installs |
| **Bundler** | Rolldown | UI bundling |

### 5.2 Gateway Stack

| Layer | Technology |
|-------|-----------|
| **WebSocket** | `ws` library |
| **HTTP Server** | Express 5.x |
| **Schema Validation** | `@sinclair/typebox` + Ajv |
| **Config** | Zod + YAML/JSON5 |
| **Logging** | tslog (structured) |

### 5.3 Channel Integrations

| Channel | Library | Protocol |
|---------|---------|----------|
| **WhatsApp** | `@whiskeysockets/baileys` | WhatsApp Web (multi-device) |
| **Telegram** | `grammy` | Telegram Bot API |
| **Discord** | `discord-api-types` + direct API | Discord Gateway |
| **Slack** | `@slack/bolt` | Slack Events API |
| **Signal** | Docker + signal-cli | Signal REST bridge |
| **iMessage** | Rust binary (imsg) | macOS IPC |

### 5.4 AI & Providers

| Provider | SDK/Approach |
|----------|--------------|
| **Pi Agent** | `@mariozechner/pi-agent-core` (RPC mode) |
| **Anthropic** | OAuth + direct API |
| **OpenAI** | OAuth + direct API |
| **Google Gemini** | OAuth + direct API |
| **Local LLMs** | `node-llama-cpp` (optional) |

### 5.5 Platform Apps

| Platform | Tech Stack |
|----------|-----------|
| **macOS** | SwiftUI, WebKit, Swift concurrency |
| **iOS** | SwiftUI, UIKit, Swift concurrency |
| **Android** | Kotlin, Jetpack Compose, Ktor |

### 5.6 Testing

| Type | Framework |
|------|-----------|
| **Unit Tests** | Vitest |
| **E2E Tests** | Vitest + Docker |
| **Coverage** | V8 (70% threshold) |
| **Linting** | Oxlint (Rust-based) |
| **Formatting** | Oxfmt |

---

## 6. Data Flow Diagrams

### 6.1 Inbound Message Processing

```
┌─────────────────────────────────────────────────────────────┐
│                 INBOUND MESSAGE FLOW                         │
└─────────────────────────────────────────────────────────────┘

Telegram/WhatsApp/Discord
      │
      ▼
Channel Monitor
  ├─> Parse message (text, media, location, reactions)
  ├─> Extract metadata (sender, chat, timestamp)
  │
  ▼
Security Layer (src/channels/plugins/)
  ├─> Check DM policy (pairing, allowlist, open)
  ├─> Verify sender authorized
  ├─> Rate limiting
  │
  ▼
Routing Layer (src/routing/)
  ├─> Resolve agent ID (bindings)
  ├─> Build session key (agent:account:channel:peer)
  ├─> Load session history
  │
  ▼
Directive Extraction (src/auto-reply/reply/)
  ├─> @think high/low/none
  ├─> @verbose on/off/full
  ├─> @exec approval
  ├─> @queue immediate/debounce
  │
  ▼
Lane Queue (src/agents/lanes.ts)
  ├─> Enqueue by session key
  ├─> Concurrency control (per-session)
  ├─> Debouncing (optional)
  │
  ▼
Pi Agent Runner (src/agents/pi-embedded.ts)
  ├─> Load workspace context
  ├─> Inject tools (channel, browser, canvas, nodes)
  ├─> Build prompt (system, user, history)
  ├─> Stream to Pi agent (RPC)
  │
  ▼
Tool Invocations
  ├─> Channel-specific (send, react, delete)
  ├─> Browser (navigate, screenshot)
  ├─> Canvas (push, eval, snapshot)
  ├─> Nodes (camera, location, screen)
  ├─> System (notify, run command)
  │
  ▼
Response Streaming
  ├─> Block streaming (text, code, thinking)
  ├─> Chunking (per-channel limits)
  ├─> Coalescing (reduce message spam)
  │
  ▼
Outbound Delivery (src/infra/outbound/)
  ├─> Format for target channel
  ├─> Retry policy (exponential backoff)
  ├─> Delivery confirmation
  │
  ▼
Channel Send
  └─> WhatsApp/Telegram/Discord/etc.
```

### 6.2 Agent Run Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                  AGENT RUN LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

CLI/Gateway Request
      │
      ▼
Register Agent Context (src/infra/agent-events.ts)
  ├─> Allocate runId
  ├─> Track in-flight run
  │
  ▼
Build Agent Input
  ├─> Load session history (last N messages)
  ├─> Attach media/files
  ├─> Apply thinking/verbose overrides
  ├─> Inject tools (filtered by permissions)
  │
  ▼
Model Selection (src/agents/model-selection.ts)
  ├─> Primary model (config)
  ├─> Fallback chain (auto/manual)
  ├─> Auth profile (OAuth rotation)
  │
  ▼
Pi Agent RPC
  ├─> Open WebSocket to Pi runtime
  ├─> Stream request
  ├─> Receive deltas (text, thinking, tool calls)
  │
  ▼
Event Broadcasting
  ├─> Emit "agent" events to WS clients
  ├─> Update chat run buffers
  ├─> Delta coalescing (reduce spam)
  │
  ▼
Tool Execution
  ├─> Validate tool call
  ├─> Execute (sync or async)
  ├─> Return result to agent
  │
  ▼
Session Update (src/config/sessions.ts)
  ├─> Append user message
  ├─> Append assistant response
  ├─> Prune history (sliding window)
  ├─> Persist to disk
  │
  ▼
Clear Agent Context
  └─> Cleanup runId, buffers
```

### 6.3 Plugin Loading

```
┌─────────────────────────────────────────────────────────────┐
│                  PLUGIN LOADING FLOW                         │
└─────────────────────────────────────────────────────────────┘

Gateway Startup
      │
      ▼
Scan Extensions (extensions/*)
  ├─> Read package.json
  ├─> Check "clawdbot-plugin" keyword
  │
  ▼
Load Plugin (src/plugins/runtime.ts)
  ├─> Use jiti for ESM/CJS interop
  ├─> Resolve dependencies (isolated)
  ├─> Import plugin module
  │
  ▼
Validate Plugin
  ├─> Check exports (service, channelPlugin)
  ├─> Validate config schema (Zod)
  │
  ▼
Register Plugin
  ├─> Channel plugins → channel registry
  ├─> Gateway handlers → method registry
  ├─> Services → lifecycle management
  │
  ▼
Start Services (if enabled)
  ├─> Call service.start()
  ├─> Register HTTP routes (optional)
  ├─> Subscribe to events (optional)
  │
  ▼
Hot-Reload Support
  └─> Watch config changes → stop/start services
```

---

## 7. Key Innovations (The "Unlock")

### 7.1 Unified Personal Assistant Gateway

**Innovation**: Single control plane for all messaging channels + AI agents + automation

**Why it matters**:
- Traditional AI chatbots are platform-locked (Telegram bot, Discord bot, etc.)
- Clawdbot unifies WhatsApp, Telegram, Discord, Slack, Signal, iMessage, Teams, Matrix, etc.
- One assistant, many surfaces
- Cross-channel identity linking (WhatsApp user = Telegram user)

### 7.2 Multi-Agent Routing

**Innovation**: Route different channels/accounts/peers to isolated agents with separate workspaces

**Use cases**:
- Personal agent vs. work agent
- Family group chat → different agent
- VIP contacts → elevated permissions

**Implementation**: Binding rules in config:
```yaml
routing:
  bindings:
    - match:
        channel: telegram
        peer: { kind: "group", id: "123456" }
      agentId: family-agent
    - match:
        channel: slack
        accountId: work
      agentId: work-agent
```

### 7.3 Live Node System

**Innovation**: Mobile/desktop devices become agent peripherals

**Capabilities**:
- **Canvas**: Agent controls visual UI on your phone/tablet
- **Camera**: Agent requests photos/videos from device
- **Screen**: Agent records screen (debugging, screenshots)
- **Location**: Agent gets GPS coordinates
- **Notifications**: Agent sends native alerts

**Protocol**: WebSocket with pairing approval (security)

### 7.4 Skills Platform

**Innovation**: Three-tier skill system (bundled, managed, workspace)

**Tiers**:
1. **Bundled**: Shipped with Clawdbot (e.g., `youtube-dl`)
2. **Managed**: Remote registry (user-approved install)
3. **Workspace**: Agent-specific custom scripts

**Safety**: Install gating, exec approval for shell commands

### 7.5 Block Streaming with Coalescing

**Innovation**: Reduce message spam while maintaining real-time feel

**Strategy**:
- Agent streams blocks (text, code, thinking)
- Coalescer batches rapid updates
- Sends when: idle timeout OR min chars reached
- Result: 1-3 messages instead of 50+ edits

**Configurable per-channel** (Telegram has edit limits, WhatsApp doesn't)

### 7.6 Gateway Hot-Reload

**Innovation**: Config changes apply without full restart

**Selective reload**:
- Hooks: reload in-place
- Channels: stop/start specific channel
- Cron: reschedule jobs
- Full restart: only when protocol/bind changes

**Implementation**: File watcher + diffing (`src/gateway/config-reload.ts`)

---

## 8. Actionable Breakdown

### 8.1 Essential Components (Cannot Remove)

1. **Gateway WebSocket Server** (`src/gateway/server.impl.ts`)
   - Core control plane
   - Session management
   - Event broadcasting

2. **At Least One Channel** (`src/channels/plugins/`)
   - WhatsApp is typical entry point
   - Telegram is easiest (bot token)

3. **Pi Agent Runtime** (`src/agents/pi-embedded.ts`)
   - AI execution engine
   - Tool orchestration

4. **Config System** (`src/config/`)
   - Zod schemas
   - YAML/JSON5 IO

5. **CLI** (`src/cli/`, `src/commands/`)
   - `clawdbot gateway`
   - `clawdbot agent`
   - `clawdbot message send`

### 8.2 High-Value Optional Components

1. **Multi-Channel Support** (`src/channels/plugins/`)
   - More channels = more flexibility
   - Each channel: 200-500 LOC

2. **Node System** (`apps/ios/`, `apps/android/`, `apps/macos/`)
   - Adds camera, canvas, screen capabilities
   - Requires WebSocket client implementation

3. **Browser Control** (`src/browser/`)
   - Web automation
   - Screenshot capture

4. **Canvas + A2UI** (`src/canvas-host/`)
   - Visual workspace
   - Agent-driven UI

5. **Cron + Webhooks** (`src/cron/`, `src/gateway/hooks.ts`)
   - Scheduled tasks
   - External integrations

6. **Control UI** (`ui/`)
   - Web dashboard
   - WebChat interface

### 8.3 Non-Essential (Can Defer/Remove)

1. **Extensions** (`extensions/*`)
   - BlueBubbles, Matrix, Zalo, etc.
   - Use only if needed

2. **TUI** (`src/tui/`)
   - Terminal UI for chat
   - Rarely used

3. **macOS Menu Bar App** (`apps/macos/`)
   - Nice-to-have on macOS
   - Not required for core functionality

4. **Tailscale Integration** (`src/gateway/server-tailscale.ts`)
   - Remote access convenience
   - SSH tunnel works too

5. **OAuth Providers** (`src/providers/`)
   - GitHub Copilot, Qwen, etc.
   - Use if needed

### 8.4 Rebuild Strategy (Minimal Clone)

**Core Stack** (30% of codebase, 80% of value):

```typescript
// 1. Gateway Core
src/gateway/
  server.impl.ts          // Main server
  server-runtime-state.ts // State management
  server-ws-runtime.ts    // WebSocket handlers
  server-methods.ts       // RPC methods

// 2. One Channel (e.g., Telegram)
src/channels/plugins/telegram.ts
src/telegram/
  accounts.ts
  send.ts
  monitor.ts

// 3. Agent Runtime
src/agents/
  pi-embedded.ts          // Pi agent wrapper
  cli-runner.ts           // CLI execution
  model-selection.ts      // Model catalog

// 4. Config + CLI
src/config/
  config.ts
  zod-schema.ts
src/cli/
  program.ts
  deps.ts
src/commands/
  agent.ts
  gateway.ts

// 5. Utilities
src/infra/
  env.ts
  dotenv.ts
  errors.ts
src/utils.ts
```

**Estimated LOC**: ~15,000 lines (5% of total)
**Functionality**: Single-channel AI assistant with CLI

**Expansion Path**:
1. Add more channels (plug-and-play)
2. Add nodes (mobile apps)
3. Add browser/canvas (advanced tools)
4. Add extensions (ecosystem)

---

## 9. Directory Structure Map

```
/home/user/clawdbot/
├── src/                          # Core TypeScript source
│   ├── gateway/                  # Gateway WebSocket server (120+ files)
│   │   ├── server.impl.ts        # Main server orchestration
│   │   ├── server-methods.ts     # RPC method registry
│   │   ├── server-channels.ts    # Channel lifecycle
│   │   ├── server-chat.ts        # Chat event handling
│   │   ├── server-cron.ts        # Cron service
│   │   ├── hooks.ts              # Webhook system
│   │   └── protocol/             # TypeBox schemas
│   │
│   ├── channels/                 # Channel abstraction layer
│   │   ├── plugins/              # Channel plugin implementations
│   │   │   ├── whatsapp.ts
│   │   │   ├── telegram.ts
│   │   │   ├── discord.ts
│   │   │   ├── slack.ts
│   │   │   └── ... (15+ channels)
│   │   ├── dock.ts               # Channel registry
│   │   ├── allowlists/           # Access control
│   │   └── session.ts            # Session tracking
│   │
│   ├── agents/                   # Pi agent integration (300+ files)
│   │   ├── pi-embedded.ts        # Embedded Pi runner
│   │   ├── cli-runner.ts         # CLI agent execution
│   │   ├── model-catalog.ts      # Model registry
│   │   ├── model-fallback.ts     # Failover logic
│   │   ├── skills.ts             # Skills platform
│   │   ├── tools/                # Agent tools (30+ tools)
│   │   └── schema/               # TypeBox tool schemas
│   │
│   ├── cli/                      # CLI commands (80+ files)
│   │   ├── program/              # Command registry
│   │   ├── deps.ts               # Dependency injection
│   │   ├── gateway-cli/          # Gateway commands
│   │   ├── channels-cli.ts       # Channel management
│   │   └── ... (30+ CLI modules)
│   │
│   ├── commands/                 # Command implementations
│   │   ├── agent.ts              # Agent command
│   │   ├── gateway.ts            # Gateway start
│   │   ├── onboard.ts            # Wizard
│   │   └── ... (20+ commands)
│   │
│   ├── config/                   # Configuration system
│   │   ├── config.ts             # Config loader
│   │   ├── zod-schema.ts         # Master Zod schema
│   │   ├── types.ts              # TypeScript types
│   │   └── validation.ts         # Validators
│   │
│   ├── routing/                  # Multi-agent routing
│   │   ├── resolve-route.ts      # Route resolver
│   │   └── session-key.ts        # Session key builder
│   │
│   ├── auto-reply/               # Reply pipeline
│   │   ├── reply/                # Message processing
│   │   ├── templating.ts         # Template engine
│   │   └── chunk.ts              # Message chunking
│   │
│   ├── infra/                    # Infrastructure (100+ files)
│   │   ├── agent-events.ts       # Event bus
│   │   ├── ports.ts              # Port management
│   │   ├── update-check.ts       # Auto-update
│   │   ├── tls/                  # TLS/cert handling
│   │   └── outbound/             # Outbound delivery
│   │
│   ├── browser/                  # Browser control (CDP)
│   ├── canvas-host/              # Canvas HTTP server
│   ├── cron/                     # Cron job system
│   ├── hooks/                    # Webhook system
│   ├── media/                    # Media pipeline
│   ├── memory/                   # Vector memory
│   ├── plugins/                  # Plugin runtime
│   ├── providers/                # OAuth providers
│   ├── sessions/                 # Session management
│   ├── terminal/                 # Terminal UI helpers
│   ├── tts/                      # Text-to-speech
│   ├── wizard/                   # Onboarding wizard
│   │
│   ├── telegram/                 # Telegram implementation
│   ├── discord/                  # Discord implementation
│   ├── slack/                    # Slack implementation
│   ├── signal/                   # Signal implementation
│   ├── imessage/                 # iMessage implementation
│   ├── web/                      # WhatsApp implementation
│   └── whatsapp/                 # WhatsApp helpers
│
├── apps/                         # Platform apps
│   ├── macos/                    # macOS SwiftUI app
│   ├── ios/                      # iOS SwiftUI app
│   ├── android/                  # Android Kotlin app
│   └── shared/                   # Shared Swift code
│
├── extensions/                   # Gateway plugins (30+)
│   ├── bluebubbles/              # BlueBubbles channel
│   ├── matrix/                   # Matrix channel
│   ├── msteams/                  # Microsoft Teams
│   ├── zalo/                     # Zalo channel
│   └── ... (30+ extensions)
│
├── ui/                           # Control UI (Lit-based)
├── docs/                         # Mintlify docs (500+ pages)
├── skills/                       # Bundled skills
├── scripts/                      # Build/dev scripts
├── test/                         # Test fixtures
└── dist/                         # Build output
```

---

## 10. Architectural Diagrams (ASCII)

### 10.1 High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MESSAGING SURFACES                              │
│  WhatsApp │ Telegram │ Discord │ Slack │ Signal │ iMessage │ Teams ...  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             │ Inbound messages
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       CHANNEL LAYER (Adapters)                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐            │
│  │ WhatsApp  │  │ Telegram  │  │  Discord  │  │   Slack   │            │
│  │  Plugin   │  │  Plugin   │  │  Plugin   │  │  Plugin   │            │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘            │
│        │              │              │              │                   │
│        └──────────────┴──────────────┴──────────────┘                   │
│                             │                                            │
│                    Channel Registry + Dock                               │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       ROUTING & SESSION LAYER                            │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │ Route Resolver                                              │        │
│  │  • Binding rules (channel/account/peer → agent)            │        │
│  │  • Session key builder (agent:account:channel:peer)        │        │
│  │  • Identity linking (cross-channel)                        │        │
│  └─────────────────────────────────────────────────────────────┘        │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         GATEWAY CONTROL PLANE                            │
│   ws://127.0.0.1:18789                                                  │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ WebSocket Server                                             │       │
│  │  • Protocol validation (TypeBox schemas)                    │       │
│  │  • Auth/pairing (device tokens)                             │       │
│  │  • Event broadcasting (agent, chat, presence, health)       │       │
│  │  • Method registry (40+ RPC methods)                        │       │
│  └──────────────────────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ Gateway Services                                             │       │
│  │  • Config hot-reload     • Cron scheduler                   │       │
│  │  • Webhook dispatcher    • Plugin runtime                   │       │
│  │  • Node registry         • Health monitor                   │       │
│  │  • TLS/Tailscale         • Discovery (Bonjour)              │       │
│  └──────────────────────────────────────────────────────────────┘       │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ├──────────────┬──────────────┬──────────────┐
                             ▼              ▼              ▼              ▼
                    ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
                    │ Pi Agent   │  │   CLI      │  │  Nodes     │  │ Control UI │
                    │  (RPC)     │  │            │  │ (iOS/Andr) │  │  (Web)     │
                    │            │  │ • gateway  │  │            │  │            │
                    │ • Tools    │  │ • agent    │  │ • Canvas   │  │ • WebChat  │
                    │ • Stream   │  │ • send     │  │ • Camera   │  │ • Sessions │
                    │ • Sessions │  │ • config   │  │ • Screen   │  │ • Health   │
                    └────────────┘  └────────────┘  └────────────┘  └────────────┘
```

### 10.2 Plugin Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PLUGIN SYSTEM LAYERS                              │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                       CORE (Built-in Channels)                           │
│  src/channels/plugins/                                                  │
│  ├── whatsapp.ts       (WhatsApp via Baileys)                          │
│  ├── telegram.ts       (Telegram via grammY)                           │
│  ├── discord.ts        (Discord via direct API)                        │
│  ├── slack.ts          (Slack via Bolt SDK)                            │
│  ├── signal.ts         (Signal via signal-cli)                         │
│  ├── imessage.ts       (iMessage via imsg binary)                      │
│  └── line.ts           (LINE via official SDK)                         │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             │ Loaded at build time
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CHANNEL PLUGIN INTERFACE                            │
│  src/channels/plugins/types.plugin.ts                                   │
│                                                                          │
│  type ChannelPlugin<ResolvedAccount> = {                                │
│    id: ChannelId;                                                       │
│    meta: ChannelMeta;               // Display name, icon              │
│    capabilities: {                  // Feature flags                   │
│      chatTypes: [...],              // DM, group, channel, thread       │
│      reactions?: boolean,           // Emoji reactions                  │
│      polls?: boolean,               // Poll support                     │
│      media?: boolean,               // Media attachments                │
│      blockStreaming?: boolean,      // Edit support                     │
│    };                                                                    │
│    config: ChannelConfigAdapter;    // Account resolution               │
│    auth?: ChannelAuthAdapter;       // Login/logout                     │
│    pairing?: ChannelPairingAdapter; // Pairing flow                     │
│    security?: ChannelSecurityAdapter; // DM policy, allowlists          │
│    outbound?: ChannelOutboundAdapter; // Send messages                  │
│    gateway?: ChannelGatewayAdapter; // Gateway lifecycle                │
│    streaming?: ChannelStreamingAdapter; // Block streaming              │
│    threading?: ChannelThreadingAdapter; // Thread support               │
│    agentTools?: ChannelAgentToolFactory; // Channel-specific tools      │
│    // ... 15+ adapter interfaces                                        │
│  };                                                                      │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             │ Runtime extension
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    EXTENSIONS (User Plugins)                             │
│  extensions/                                                             │
│  ├── bluebubbles/       (iMessage via BlueBubbles server)               │
│  ├── matrix/            (Matrix protocol)                               │
│  ├── msteams/           (Microsoft Teams)                               │
│  ├── zalo/              (Zalo Business)                                 │
│  ├── zalouser/          (Zalo Personal)                                 │
│  ├── voice-call/        (SIP/WebRTC)                                    │
│  └── ... (30+ extensions)                                               │
│                                                                          │
│  Each extension:                                                         │
│  ├── package.json       (keywords: ["clawdbot-plugin"])                 │
│  ├── src/index.ts       (exports: { channelPlugin, service })           │
│  └── README.md                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             │ Loaded via jiti (dynamic)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       PLUGIN RUNTIME                                     │
│  src/plugins/runtime.ts                                                 │
│                                                                          │
│  loadGatewayPlugins():                                                  │
│  1. Scan extensions/* for package.json with "clawdbot-plugin"          │
│  2. Check config (plugins.enabled: ["bluebubbles", ...])               │
│  3. Use jiti to import (ESM/CJS compatible)                             │
│  4. Validate exports (channelPlugin, service)                           │
│  5. Register in channel registry                                        │
│  6. Start services (if provided)                                        │
│  7. Register HTTP routes (optional)                                     │
│  8. Subscribe to gateway events (optional)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.3 Message Flow (Detailed)

```
┌─────────────────────────────────────────────────────────────────────────┐
│         INBOUND MESSAGE PROCESSING (Telegram Example)                   │
└─────────────────────────────────────────────────────────────────────────┘

User sends "Hello @clawd"
      │
      ▼
Telegram Bot API
      │
      ▼
grammY Handler (src/telegram/monitor.ts)
      │
      ├─> Parse update (message, sender, chat)
      ├─> Extract text, media, reactions
      │
      ▼
Channel Plugin (src/channels/plugins/telegram.ts)
      │
      ├─> Resolve account (multi-account support)
      ├─> Security check:
      │     ├─> DM policy (pairing/allowlist/open)
      │     ├─> Verify sender in allowlist
      │     └─> Rate limiting
      │
      ▼
Routing (src/routing/resolve-route.ts)
      │
      ├─> Match bindings:
      │     ├─> Peer-specific? (e.g., group:123 → agent:family)
      │     ├─> Guild/Team?
      │     ├─> Account?
      │     └─> Default agent
      │
      ├─> Build session key:
      │     Format: {agentId}:{accountId}:{channel}:{peer}
      │     Example: main:default:telegram:group:123456
      │
      └─> Load session history (last 50 messages)
      │
      ▼
Auto-Reply Pipeline (src/auto-reply/reply/get-reply.ts)
      │
      ├─> Extract directives:
      │     ├─> @think high|low|none → thinking override
      │     ├─> @verbose on|off|full → verbosity
      │     ├─> @exec → shell execution approval
      │     └─> @queue immediate|debounce → queue mode
      │
      ├─> Mention gating:
      │     ├─> Group chat? Check if bot mentioned
      │     └─> Skip if not mentioned (unless configured)
      │
      ├─> Build context:
      │     ├─> Previous messages (history)
      │     ├─> Attachments (images, audio, files)
      │     ├─> Location (if present)
      │     └─> Reply chain (threading)
      │
      ▼
Lane Queue (src/agents/lanes.ts)
      │
      ├─> Enqueue by session key (concurrency control)
      ├─> Debouncing (if configured):
      │     └─> Wait N ms for more messages from same session
      │
      ▼
Agent Runner (src/agents/pi-embedded.ts)
      │
      ├─> Allocate runId (track in-flight run)
      │
      ├─> Model selection:
      │     ├─> Primary model (config)
      │     ├─> Fallback chain (auto/manual)
      │     └─> Auth profile (OAuth rotation)
      │
      ├─> Build agent input:
      │     ├─> System prompt (workspace context)
      │     ├─> User message + history
      │     ├─> Tool injection:
      │     │     ├─> Channel tools (telegram.send, telegram.react)
      │     │     ├─> Browser (navigate, screenshot)
      │     │     ├─> Canvas (push, eval)
      │     │     ├─> Nodes (camera, location)
      │     │     └─> System (notify, run command)
      │     │
      │     └─> Thinking level (high/low/none)
      │
      ▼
Pi Agent (RPC via WebSocket)
      │
      ├─> Stream request to Pi runtime
      ├─> Receive deltas:
      │     ├─> <text> blocks (content)
      │     ├─> <thinking> blocks (reasoning)
      │     ├─> <code> blocks (code execution)
      │     └─> <tool_call> blocks (tool invocations)
      │
      ├─> Tool execution:
      │     ├─> Validate tool call
      │     ├─> Execute (sync or async)
      │     └─> Return result to agent
      │
      └─> Final response
      │
      ▼
Event Broadcasting (src/gateway/server-chat.ts)
      │
      ├─> Emit "agent" events to WS clients:
      │     ├─> macOS app (update UI)
      │     ├─> Control UI (show progress)
      │     └─> CLI (stream to stdout)
      │
      ├─> Update chat run buffers:
      │     └─> Delta coalescing (reduce spam)
      │
      ▼
Block Streaming (src/auto-reply/reply/streaming.ts)
      │
      ├─> Coalescing strategy:
      │     ├─> Wait for idle timeout (500ms)
      │     ├─> OR min chars threshold (100)
      │     └─> Send batch
      │
      ├─> Chunking (per-channel limits):
      │     ├─> Telegram: 4000 chars
      │     ├─> WhatsApp: 4000 chars
      │     └─> Discord: 2000 chars
      │
      ▼
Outbound Delivery (src/infra/outbound/deliver.ts)
      │
      ├─> Format for target channel:
      │     ├─> Markdown conversion
      │     ├─> Code block formatting
      │     └─> Mention mapping
      │
      ├─> Retry policy:
      │     ├─> Exponential backoff (1s, 2s, 4s, 8s)
      │     └─> Max 5 retries
      │
      ├─> Delivery confirmation
      │
      ▼
Telegram API (grammY)
      │
      └─> Send message via Bot API
      │
      ▼
User receives "Hello! How can I help?"
      │
      ▼
Session Update (src/config/sessions.ts)
      │
      ├─> Append to session history:
      │     ├─> User message
      │     └─> Assistant response
      │
      ├─> Prune history (sliding window, last 50)
      │
      └─> Persist to disk (~/.clawdbot/sessions/...)
```

---

## 11. Summary & Recommendations

### 11.1 Architectural Strengths

1. **Modular Design**: Channel plugins, gateway plugins, and tool systems are all pluggable
2. **Type Safety**: Comprehensive TypeScript + Zod validation throughout
3. **Testability**: Dependency injection, comprehensive test coverage (70%)
4. **Scalability**: Lane-based concurrency, multi-agent routing
5. **Developer Experience**: Hot-reload, CLI wizard, comprehensive docs

### 11.2 Potential Improvements

1. **Code Organization**: Some files exceed 500 LOC guideline (server.impl.ts is 585 lines)
2. **Abstraction Layers**: Some channel-specific code could be further abstracted
3. **Documentation**: Inline code comments could be more comprehensive
4. **Error Handling**: Some error paths could be more granular

### 11.3 Key Takeaways for Developers

**If you want to**:

- **Add a new channel**: Implement `ChannelPlugin` interface (~300-500 LOC)
- **Add a tool**: Add TypeBox schema + implementation in `src/agents/tools/`
- **Add a command**: Create file in `src/commands/`, register in `src/cli/program/`
- **Add a platform app**: Follow iOS/Android patterns in `apps/`
- **Extend Gateway**: Create plugin in `extensions/` with `channelPlugin` or `service` export

**Core files to understand**:
1. `src/gateway/server.impl.ts` - Gateway orchestration
2. `src/channels/plugins/types.plugin.ts` - Channel interface
3. `src/agents/pi-embedded.ts` - Agent execution
4. `src/routing/resolve-route.ts` - Multi-agent routing
5. `src/config/config.ts` - Configuration system

### 11.4 Innovation Summary

Clawdbot's **key differentiator** is the **unified personal assistant** concept:
- One assistant across all your messaging platforms
- Local-first with full control (no cloud lock-in)
- Multi-agent routing for context isolation
- Live nodes (your devices become agent peripherals)
- Skills platform for extensibility

This is **not** a chatbot framework or a multi-tenant service. It's a **personal infrastructure** for AI assistance.

---

**Document Version**: 1.0
**Generated**: 2026-01-28
**Codebase Snapshot**: `claude/architect-agent-codebase-o0LhQ` branch
**Total Files Analyzed**: 1,600+ TypeScript source files
**Lines of Code**: ~283,000
