# Multi-Agent Harness

This document defines the execution layer behind the Development Portal.

The portal is the human-facing projection. The harness is the worker-facing coordination layer.

## Core rule

> **GitHub owns project truth. The harness owns temporary execution ownership.**

Do not turn chat history, a terminal session, or the portal into a second task tracker.

- GitHub Issue = desired outcome, assignment context, dependencies, acceptance condition
- GitHub PR = implementation and verification evidence
- harness ledger = who is touching the task right now, from which harness/session/worktree
- runtime probes = whether a machine/service is currently reachable
- portal = read-only projection of all of the above

## Identity model

Never collapse model, harness and session into one field.

```text
model      = reasoning/model backend
harness    = execution environment / agent shell
transport  = how the harness is invoked
session    = one concrete run
worker     = stable identity for the claim
```

Example:

```text
model:      gpt-5.6-codex
harness:    codex
transport:  cc-workers
session:    movi-neon-01
worker:     gpt-5.6-codex/codex/movi-neon-01
```

A model can be used through multiple harnesses. A harness can change model. A session is disposable.

## Initial harness lanes

| Harness | Default role | Mutation policy |
|---|---|---|
| Claude Code | primary implementation / repository work | write, scoped |
| Codex | peer engineer, rescue, adversarial review | write only when intentionally delegated |
| OpenCode | secondary implementation lane | write in isolated worktree |
| Agy / Antigravity | long-context audit / consistency check | read-only by default |
| Devin | long-running delegated implementation | write, explicit scope |
| Gemini | survey / second opinion / selected implementation | scope-dependent |
| ChatGPT | orchestration, synthesis, interactive integration | scope-dependent |

`cc-workers` is normally a transport/router for external workers, not the model identity itself.

## Claim lifecycle

```text
ready
  ↓ claim
claimed ── renew/heartbeat ──→ claimed
  ↓ release(review)
review
  ↓ accepted
closed / done

claimed ── release(blocked) ──→ blocked
claimed ── release(ready) ────→ ready
claimed ── release(abandoned) → ready
```

A claim has a lease, but **lease expiry is not permission to steal the task**.

If a claim has expired:

1. inspect the previous owner/session
2. inspect its worktree if available
3. inspect related PRs / branches
4. only then `reclaim --evidence ...`

This prevents a slow or disconnected agent from being silently overwritten.

## Local ledger CLI

The initial implementation is `scripts/harness.mjs`.

It is deliberately small and local-per-host.

```bash
node scripts/harness.mjs claim eightman999/kamimusuhi 123 \
  --worker opus/claude-code/k0f-01 \
  --harness claude-code \
  --model opus \
  --transport local \
  --session k0f-01 \
  --worktree "$PWD"

node scripts/harness.mjs renew eightman999/kamimusuhi 123 \
  --worker opus/claude-code/k0f-01

node scripts/harness.mjs release eightman999/kamimusuhi 123 \
  --worker opus/claude-code/k0f-01 \
  --reason review \
  --note "PR #45"

node scripts/harness.mjs list
node scripts/harness.mjs snapshot --public
```

Default ledger location:

```text
${XDG_STATE_HOME:-~/.local/state}/eightman/harness
```

Override it with:

```bash
EIGHTMAN_HARNESS_DIR=/path/to/shared-state
```

## What the ledger records

A live claim can contain:

```ts
type HarnessClaim = {
  repo: string
  issue: number
  state: "claimed" | "released"

  worker: string
  model?: string
  harness: string
  transport?: string
  session?: string

  host: string
  pid: number
  worktree: string

  claimedAt: string
  heartbeatAt: string
  leaseExpiresAt: string

  lastReason?: "ready" | "review" | "blocked" | "done" | "abandoned"
  history: ClaimEvent[]
}
```

## Concurrency boundary

The v0 ledger is **atomic only on one filesystem/host**. It uses an atomic lock directory and atomic file replacement.

That is enough to stop two local harnesses from taking the same issue at once.

It is not a distributed lock across:

- MacBook
- `llm_master`
- P100 server
- Devin cloud workers
- another remote agent host

GitHub labels/comments are useful shared state but are not an atomic compare-and-swap primitive.

If cross-host concurrent claims become common, promote the claim service to a small shared coordinator (Cloudflare D1/DO, Redis, SQLite on a shared host, etc.). Keep the same claim schema and Portal projection.

## Portal projection

The Portal should eventually consume a sanitized harness snapshot:

```text
scripts/harness.mjs snapshot --public
              ↓
      harness-snapshot.json
              ↓
      Development Portal
```

The public snapshot must not expose:

- credentials
- private IPs / Tailscale addresses
- tokens
- full private filesystem paths
- prompt/chat contents

The portal only needs to know things such as:

```text
Kamimusuhi #123
CLAIMED
Claude Code
worker: opus/claude-code/k0f-01
worktree: kamimusuhi-k0f
lease: live
```

## Handoff packet

Every delegated task should be recoverable without reading the previous agent chat.

The Issue/PR should carry:

1. outcome
2. why it matters
3. edit scope
4. relevant prior decisions
5. dependencies
6. verification procedure
7. current owner/harness when useful
8. related PR / branch / artifact

The worker's final report should contain:

1. conclusion / approach
2. changed files
3. tests actually run and actual result
4. risks
5. unresolved questions
6. next action

## Portal + harness relationship

```text
                    ┌───────────────┐
                    │ GitHub Issues │  project truth
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ GitHub PRs    │  implementation evidence
                    └───────┬───────┘
                            │
┌──────────────┐    ┌───────▼────────┐    ┌──────────────┐
│ Harness      │───▶│ Normalized     │◀───│ Runtime      │
│ claim ledger │    │ current state  │    │ probes       │
└──────────────┘    └───────┬────────┘    └──────────────┘
                            │
                    ┌───────▼───────┐
                    │ Dev Portal    │
                    │ read-only     │
                    └───────────────┘
```

## Non-goals

The harness is not:

- a new issue tracker
- a chat archive
- a prompt database
- a secret store
- a distributed scheduler yet
- an excuse for every task to require an agent

## Distilled principle

> **Portal tells you what to do next. Harness prevents two workers from doing it blindly at the same time. GitHub remembers what actually happened.**
