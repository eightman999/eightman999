# Development Portal — Distilled Spec

Source inspiration: https://sumi-development.pdhaku0.workers.dev/

## Purpose

Build a single-page developer portal that answers, within ~10 seconds:

1. Where is each project now?
2. What can I touch/test right now?
3. What is the next action or blocker?
4. Where do I connect to run it?

This is not a historical dashboard. It is a **current-state view** that merges progress tracking, launch links, verification targets, and connection notes.

## Core information architecture

```text
Development Portal
│
├─ Header
│  ├─ project / workspace name
│  ├─ current status summary
│  └─ last updated
│
├─ Overall Progress
│  ├─ done / doing / testable / blocked
│  ├─ progress by project
│  └─ blockers
│
├─ Available Now
│  ├─ web
│  ├─ API
│  ├─ app
│  ├─ demo
│  └─ experiment environment
│
├─ Verify on Real Hardware
│  ├─ device / machine
│  ├─ current status
│  ├─ startup instructions
│  └─ test procedure
│
├─ Task Search
│  ├─ keyword
│  ├─ project
│  ├─ status
│  └─ tag
│
└─ Connections
   ├─ endpoint / hostname
   ├─ protocol / port
   ├─ environment
   └─ copy action
```

## Design rules

- Optimize for **current work**, not archive completeness.
- Show `doing`, `testable`, and `blocked` before large lists of completed work.
- Every visible item should answer at least one of:
  - what is happening?
  - can I run it?
  - can I test it?
  - what is blocking it?
  - where do I connect?
- Keep secrets out of the portal. Show only references such as `secret: .env`, `GitHub Actions secret`, or secret-manager key names.
- Prefer one-screen comprehension over deep navigation.
- Make URLs/endpoints copyable.
- Support keyboard-first search (`/` or `Cmd/Ctrl+K`).

## Suggested status model

```ts
type WorkStatus =
  | "todo"
  | "doing"
  | "testable"
  | "verifying"
  | "blocked"
  | "done"
```

## Minimal data model

```ts
type Task = {
  id: string
  title: string
  project: string
  status: WorkStatus
  progress?: number
  tags: string[]
  url?: string
  blocker?: string
  nextAction?: string
  updatedAt: string
}

type Target = {
  id: string
  name: string
  project: string
  kind: "web" | "api" | "device" | "server" | "app" | "experiment"
  environment: "dev" | "staging" | "production" | "local"
  status: "online" | "offline" | "unknown" | "manual"
  url?: string
  startup?: string
  verification?: string
  updatedAt?: string
}

type Connection = {
  id: string
  name: string
  project: string
  protocol: string
  endpoint: string
  environment: string
  secretRef?: string
  docs?: string
}
```

## eightman project grouping

Initial top-level groups:

### Kamimusuhi

- K0 / K0-F
- CX-derived state / persistence experiments
- runtime integration
- J-series language models / tokenizer work
- memory / identity / distributed execution

### MOVI

- ZeusCar runtime
- gaze/head/scene sensing
- Pupil Labs Neon / wearable eye tracking
- gaze-as-evidence intent estimator
- physical integration / real-hardware verification

### OISINT

- web
- Android
- iOS
- store / billing
- production search and data pipeline

### Local LLM / Infrastructure

- `llm_master`
- P100 multi-GPU server
- Mac / CUDA heterogeneous inference
- Pi gateway
- distributed inference experiments
- YLSB benchmarks

### Research / Experiments

- surveys
- reproducibility artifacts
- benchmark runs
- paper / implementation validation

## UI skeleton

```text
┌──────────────────────────────────────────────────────────────┐
│ eightman Development                           updated 21:30 │
│ 4 doing · 3 testable · 2 blocked                           │
├──────────────────────────────────────────────────────────────┤
│ CURRENT / BLOCKERS                                           │
│ [Kamimusuhi] K0-F runtime integration      DOING             │
│ [MOVI] Neon intent pipeline                 TESTABLE          │
│ [OISINT] Store billing                      BLOCKED           │
├──────────────────────────────────────────────────────────────┤
│ AVAILABLE NOW                                                │
│ Web      API      Device      Server      Experiment          │
│ ...                                                          │
├──────────────────────────────────────────────────────────────┤
│ VERIFY ON REAL HARDWARE                                      │
│ Neon / ZeusCar / llm_master / P100 server ...               │
├──────────────────────────────────────────────────────────────┤
│ / Search tasks, targets, endpoints...                        │
├──────────────────────────────────────────────────────────────┤
│ CONNECTIONS                                                  │
│ name      endpoint                 env       status           │
└──────────────────────────────────────────────────────────────┘
```

## Implementation recommendation

Phase 1 should stay deliberately small.

```text
Vite + React + TypeScript
Tailwind CSS
Cloudflare Pages / Workers
static TS/JSON data in repo
```

Suggested structure:

```text
portal/
├─ src/
│  ├─ components/
│  │  ├─ ProgressOverview.tsx
│  │  ├─ CurrentWork.tsx
│  │  ├─ AvailableTargets.tsx
│  │  ├─ HardwareVerification.tsx
│  │  ├─ TaskSearch.tsx
│  │  └─ ConnectionPanel.tsx
│  ├─ data/
│  │  ├─ tasks.ts
│  │  ├─ targets.ts
│  │  └─ connections.ts
│  └─ App.tsx
└─ package.json
```

No database is required initially. Keep state in Git so a normal commit updates the portal.

## Phase 2: automatic GitHub projection

Later, replace only the progress/task source with GitHub-derived data.

```text
GitHub Issues / PRs / commits
          ↓
      GitHub API
          ↓
 normalized Task[]
          ↓
 hand-maintained targets + connection metadata
          ↓
      Development Portal
```

Useful mappings:

- open PR → `verifying`
- issue with active implementation label → `doing`
- issue/PR with hardware-test label → `testable`
- blocker label / dependency → `blocked`
- merged PR / closed completed issue → `done`

Do not infer completion only from commit activity.

## Phase 3: live operational state

Optional health checks can augment targets with:

- HTTP reachability
- `/health` status
- last successful deployment
- CI state
- machine heartbeat

Keep these **advisory**. A temporary network failure must not rewrite project truth.

## Non-goals for v1

- full project management replacement
- Jira/Linear clone
- secret manager
- infrastructure control plane
- long-term analytics dashboard
- automatic write-back to issues

## Acceptance criteria for v1

A first-time viewer should be able to answer these without opening another page:

- what are the 3–5 most active efforts?
- what is blocked?
- what can be tested immediately?
- which environment/device/server should be used?
- where is the relevant repo/PR/demo/endpoint?

If those answers take more than one screen or require reading long prose, the portal is too complicated.

## Distilled principle

> Progress tracking + launcher + verification bench + connection ledger, on one page.

The value is not the visual style itself. The value is reorganizing scattered developer knowledge around **the current state and the next executable action**.
