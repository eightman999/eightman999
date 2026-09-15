# Development Portal — Deep Distillation

Source inspiration: https://sumi-development.pdhaku0.workers.dev/

This document does **not** attempt to clone Sumi's styling. It extracts the product idea underneath it and adapts that idea to eightman's multi-project, multi-machine, multi-agent development workflow.

---

## 0. The whole idea in one sentence

> **Project truth in GitHub + runtime truth from machines + a very small amount of manual metadata → one current-state projection → the next executable action.**

This is not a dashboard for admiring progress.

It is a **developer cockpit** for answering:

- what matters now?
- what is blocked?
- what can I run or verify right now?
- what machine / environment / repo should I touch?
- what is the next concrete action?

If the portal does not make the next action easier, the information does not belong on the first screen.

---

# 1. What is actually worth stealing from Sumi

The useful idea is not the exact colors, typography, or card layout.

The useful idea is the **compression strategy**.

A normal project page tends to organize information by its storage location:

```text
GitHub Issues
GitHub PRs
README
CI
servers
URLs
notes
hardware
chat logs
```

A developer does not think that way when resuming work.

The developer thinks:

```text
Where are we?
What is alive?
What is broken?
What can I test?
Where do I connect?
What do I do next?
```

The portal should reorganize scattered information around those questions.

## Therefore, copy these ideas

1. **Current state before history**
2. **Action before analytics**
3. **Runnable / testable things are first-class objects**
4. **Connections are part of development state, not buried documentation**
5. **Search is an escape hatch, not the primary navigation**
6. **One screen should provide orientation**
7. **The portal should project existing truth, not become another truth store**

## Do not copy these blindly

- exact styling
- exact section names
- assumptions that there is only one repository
- assumptions that all development happens on one machine
- project-management features already handled by GitHub
- progress percentages that cannot be derived honestly

---

# 2. The deeper Sumi lesson: do not duplicate project truth

The strongest part of the Sumi workflow is below the visible page.

Sumi's documented workflow treats:

- **GitHub Issues as the canonical record of an outcome and ownership**
- **PRs as the canonical record of implementation and verification**
- task states as iterative (`ready`, `in-progress`, `review`, `blocked`, closed)
- blocked work as something that must include a **reason and unblock condition**
- agent/chat state as non-canonical

That means the development page can remain a **projection** rather than a second project manager.

For eightman, use the same principle:

```text
GitHub Issue / PR / repo state       authoritative development truth
machine / endpoint probe            observed operational truth
portal config                       declared metadata only
portal UI                           projection, never source of truth
```

The first version should therefore be **read-only**.

Changing a badge in the portal must not be how a task becomes complete.

---

# 3. The fundamental separation: state, affordance, and availability

The previous rough spec mixed concepts such as `doing`, `testable`, and `online` into one status model.

That should be corrected.

They are three independent axes.

## 3.1 Work lifecycle

```ts
type WorkState =
  | "ready"
  | "in_progress"
  | "review"
  | "blocked"
  | "done"
```

Meaning:

- `ready`: valid work that can be picked up
- `in_progress`: someone or some agent is actively working on it
- `review`: implementation exists and awaits acceptance / verification
- `blocked`: work cannot advance; blocker and unblock condition must be known
- `done`: accepted outcome, normally derived from closed issue / merged and accepted PR

These states are **not necessarily one-way**.

`review → in_progress`, `blocked → ready`, and `done → reopened` are valid.

## 3.2 Verification affordance

`testable` is not a lifecycle state.

It describes whether there is something a human can verify now.

```ts
type VerificationState =
  | "none"
  | "available"
  | "pending"
  | "passing"
  | "failing"
  | "manual"
```

Examples:

- a MOVI branch may be `review + available`
- a Kamimusuhi experiment may be `in_progress + available`
- an OISINT store task may be `blocked + manual`

This separation prevents the UI from inventing awkward states such as `doing-but-testable`.

## 3.3 Operational availability

Runtime availability belongs to a target, not to a task.

```ts
type Availability =
  | "online"
  | "degraded"
  | "offline"
  | "manual"
  | "unknown"
```

A server going offline does **not** change the corresponding Issue from `in_progress` to `blocked` unless that outage actually blocks the work.

---

# 4. The five jobs the portal must perform

## Job A — Orientation

Within roughly three seconds:

- what are the major active projects?
- what requires attention?
- is anything blocked?

## Job B — Resume work

Within roughly ten seconds:

- which task was active?
- what is its next action?
- where is its Issue / PR / branch / docs?

## Job C — Run something

Without searching old messages:

- what can be launched now?
- which URL / API / app / model / machine?
- what command or entrypoint starts it?

## Job D — Verify something

For work that needs human or physical validation:

- what exactly should be tested?
- on which hardware?
- what result constitutes success?
- where should evidence be recorded?

## Job E — Recover context after interruption

The portal should be useful after:

- sleeping
- switching projects
- a long agent run
- a machine reboot
- several days away from a repo

The page should act as a **working-memory reload surface**.

---

# 5. Truth model

Every displayed fact should have an origin.

```ts
type TruthKind =
  | "authoritative" // GitHub issue/PR/repo state
  | "declared"      // manually maintained metadata
  | "observed"      // health check / machine probe / CI result
  | "derived"       // calculated summary
```

Every normalized object should preserve provenance when practical:

```ts
type Provenance = {
  kind: TruthKind
  source: string
  observedAt?: string
}
```

Examples:

```text
"PR #42 is open"                    authoritative
"ZeusCar requires Neon attached"    declared
"llm_master /health returned 200"   observed
"MOVI needs attention"              derived
```

The UI should never present a derived guess with the same authority as a GitHub state.

---

# 6. Core domain model

The portal only needs seven concepts.

```text
Project
WorkItem
Artifact
Target
Connection
Verification
Signal
```

## 6.1 Project

A stable top-level area of work.

```ts
type Project = {
  id: string
  name: string
  description?: string
  repos: string[]
  tags?: string[]
  links?: Link[]
  visibility: "public" | "private"
}
```

## 6.2 WorkItem

A normalized Issue / task outcome.

```ts
type WorkItem = {
  id: string
  projectId: string
  title: string
  state: WorkState

  repo?: string
  issueNumber?: number
  issueUrl?: string
  prUrls?: string[]

  owner?: string
  blocker?: string
  unblockCondition?: string
  nextAction?: string

  verification: VerificationState
  verificationId?: string

  tags: string[]
  updatedAt: string
  provenance: Provenance
}
```

## 6.3 Artifact

Something produced by development.

Examples:

- PR
- build
- model
- benchmark result
- APK
- web deployment
- paper draft
- dataset

```ts
type Artifact = {
  id: string
  projectId: string
  name: string
  kind: "pr" | "build" | "model" | "dataset" | "benchmark" | "document" | "release"
  url?: string
  version?: string
  status?: string
  updatedAt?: string
}
```

## 6.4 Target

Something that can be opened, run, called, or touched.

```ts
type Target = {
  id: string
  projectId: string
  name: string
  kind: "web" | "api" | "app" | "server" | "device" | "model" | "experiment"
  environment: "local" | "lab" | "dev" | "staging" | "production"
  availability: Availability

  openUrl?: string
  endpoint?: string
  launchCommand?: string
  docsUrl?: string

  machineId?: string
  verificationId?: string

  provenance: Provenance
}
```

## 6.5 Connection

Enough information to find a target, but never credentials.

```ts
type Connection = {
  id: string
  targetId: string
  protocol: string
  endpoint?: string
  port?: number
  network?: "public" | "lan" | "tailnet" | "local"
  secretRef?: string
  notes?: string
}
```

`secretRef` means a reference such as:

```text
GitHub Environment: production
1Password item name
.env.local key name
Cloudflare secret name
```

Never store tokens or passwords in this repository.

## 6.6 Verification

A first-class test recipe.

```ts
type Verification = {
  id: string
  projectId: string
  title: string
  targetIds: string[]
  prerequisites?: string[]
  steps: string[]
  success: string[]
  evidenceDestination?: string
  lastResult?: "pass" | "fail" | "unknown"
  lastVerifiedAt?: string
}
```

This is especially important for MOVI and hardware work.

## 6.7 Signal

Ephemeral observed information.

```ts
type Signal = {
  id: string
  targetId?: string
  kind: "health" | "ci" | "deploy" | "heartbeat" | "benchmark"
  state: "ok" | "warn" | "error" | "unknown"
  summary: string
  observedAt: string
}
```

Signals inform the page but do not overwrite canonical work state.

---

# 7. The page should answer questions, not expose tables

The information architecture should follow human questions.

```text
┌───────────────────────────────────────────────────────────────┐
│ eightman Development                         refreshed 21:42 │
│ Kamimusuhi · MOVI · OISINT · LLM Infra · Research           │
├───────────────────────────────────────────────────────────────┤
│ NEEDS ATTENTION                                               │
│ blockers / failed verification / review waiting / stale work │
├───────────────────────────────────────────────────────────────┤
│ NOW                                                           │
│ the 3–7 active work items with explicit next actions         │
├───────────────────────────────────────────────────────────────┤
│ TRY / VERIFY NOW                                              │
│ runnable web/API/app/model + hardware verification           │
├───────────────────────────────────────────────────────────────┤
│ SYSTEMS                                                       │
│ machines / devices / services and advisory availability      │
├───────────────────────────────────────────────────────────────┤
│ CONNECTIONS                                                   │
│ searchable, copyable connection metadata                     │
├───────────────────────────────────────────────────────────────┤
│ / Search everything                                          │
└───────────────────────────────────────────────────────────────┘
```

The page can contain more data below the fold, but the first viewport should establish the current development situation.

---

# 8. Priority ordering

Do not sort primarily by project name or most recent timestamp.

Sort by **developer attention**.

Default ordering:

1. blocked work with a known unblock action
2. failing verification
3. review awaiting human acceptance
4. work with a runnable / testable target
5. active in-progress work
6. ready work
7. recently completed work
8. archive

Within the same class, prefer recently updated items.

A simple deterministic rank is preferable to an opaque AI-generated priority score.

---

# 9. Do not fake progress

Avoid arbitrary percentages such as:

```text
Kamimusuhi 72%
MOVI 83%
```

unless the denominator has an actual meaning.

For research and experimental systems, fake percentages are actively misleading.

Prefer counts and state summaries:

```text
Kamimusuhi
2 active · 1 review · 1 blocked · 2 verification targets
```

A progress bar is acceptable only when representing a real finite set such as:

- checklist completion
- release milestone issues
- benchmark run matrix
- migration batch
- test suite

---

# 10. The card is the atomic UI unit

Every primary work card should contain only actionable information.

```text
[MOVI] Gaze → intent integration
IN PROGRESS     VERIFY AVAILABLE

Next: run Neon + ZeusCar intent logging test
Blocker: —

Issue #…   PR #…   Verify   Repo
updated 18 min ago
```

Required display order:

1. project
2. outcome / work title
3. state
4. next action
5. blocker if present
6. verification affordance if present
7. links
8. freshness / provenance

Do not place long descriptions on cards.

Long rationale belongs in the source Issue / docs.

---

# 11. “Try now” is different from “work now”

This distinction is central.

A task describes development work.

A target describes something usable.

Examples:

```text
Task:
"Integrate K0-F with runtime"

Targets:
"K0-F local demo"
"J72 inference endpoint"
```

```text
Task:
"Validate gaze evidence accumulator"

Targets:
"Pupil Neon stream"
"ZeusCar telemetry UI"
"recorded replay dataset"
```

A target can survive after a task is done.

A task can exist before any target exists.

The UI should not force them into the same object.

---

# 12. Hardware verification is not a footnote

For MOVI, gaze systems, heterogeneous LLM inference, and lab experiments, physical verification is part of the development lifecycle.

The portal should therefore include a **verification bench**.

Example:

```text
MOVI / Neon → intent estimator

Needs:
- MacBook Pro M2 Max
- Pupil Neon
- ZeusCar

Run:
1. start sensor bridge
2. confirm gaze + IMU stream
3. start intent estimator
4. perform left / straight / right sequence

Pass:
- stream remains continuous
- intended goal persists across short gaze deviation
- no unsafe direct motor command path

Evidence:
- linked GitHub issue / PR comment
```

The portal should make a real-world test reproducible enough that future-you or an agent knows what “tested” actually meant.

---

# 13. eightman project ontology

Initial project groups:

## Kamimusuhi

Subareas:

```text
K0 / K0-F
CX / persistent state
runtime integration
J-series language path
tokenizer / training / eval
memory / identity
distributed execution
```

Typical targets:

```text
local runtime
inference endpoint
experiment runner
eval report
model artifact
```

## MOVI

Subareas:

```text
ZeusCar runtime
Pupil Neon sensing
gaze / head / scene inputs
evidence accumulator
persistent goal / CX-inspired state
intent estimator
safety controller
real-hardware validation
```

Typical targets:

```text
Neon stream
logging UI
replay dataset
ZeusCar runtime
hardware verification recipe
```

## OISINT

Subareas:

```text
web
API / data pipeline
Android
iOS
billing / RevenueCat / store
production operations
```

Typical targets:

```text
production web
staging web
API health
Android build
iOS build
store console links
```

## Local LLM / Infrastructure

Subareas:

```text
llm_master
P100 multi-GPU
Apple Silicon
heterogeneous inference
Pi gateway
Tailscale / LAN path
MCDMA / oMLX experiments
YLSB
storage / model placement
```

Typical targets:

```text
OpenAI-compatible endpoints
benchmark runner
model instance
machine
network path
```

## Research / Experiments

Subareas:

```text
surveys
paper replication
benchmarks
experimental branches
artifacts
```

This area should remain evidence-oriented rather than task-count-oriented.

---

# 14. Suggested repository-backed data layout

Keep manually maintained operational metadata small and explicit.

```text
portal/
├─ src/
│  ├─ app/
│  ├─ components/
│  ├─ lib/
│  └─ generated/
│     └─ snapshot.json
│
├─ config/
│  ├─ projects.yaml
│  ├─ targets.yaml
│  ├─ connections.yaml
│  └─ verifications.yaml
│
├─ scripts/
│  ├─ fetch-github.ts
│  ├─ probe-targets.ts
│  ├─ build-snapshot.ts
│  └─ validate-config.ts
│
├─ public/
├─ package.json
└─ wrangler.jsonc
```

Do **not** manually maintain `tasks.yaml` if the corresponding truth already exists as GitHub Issues.

---

# 15. Data pipeline

The portal should compile multiple sources into one immutable snapshot.

```text
GitHub Issues ───────┐
GitHub PRs ──────────┤
GitHub Actions ──────┤
                     │
projects.yaml ───────┤
targets.yaml ────────┤
connections.yaml ────┼──> normalize ──> snapshot.json ──> UI
verifications.yaml ──┤
                     │
optional health ─────┤
optional heartbeat ──┘
```

Benefits:

- UI is simple
- data derivation is testable
- source provenance is preserved
- frontend does not need to know every external API
- a snapshot can be inspected when something looks wrong

---

# 16. GitHub projection rules

Prefer explicit labels and relations over clever inference.

Recommended normalized mapping:

```text
open issue + state:ready        -> ready
open issue + state:in-progress -> in_progress
open issue + state:review      -> review
open issue + state:blocked     -> blocked
closed issue                   -> done
```

For repositories that do not yet use these labels, a fallback adapter may infer state, but mark its provenance as `derived`.

Useful optional labels:

```text
project:kamimusuhi
project:movi
project:oisint
project:infra

verify:hardware
verify:manual
verify:available

attention:human
```

Do not create dozens of labels solely for the portal.

The portal adapts to GitHub; GitHub should not become unreadable for the portal.

---

# 17. Human vs agent ownership

The portal will often observe work executed by coding agents.

The important distinction is not just `assigned / unassigned`.

When available, show owner identity in a compact form:

```text
human/eightman
claude/<session>
codex/<session>
devin/<session>
opencode/<session>
```

The owner is useful for answering:

> “Is something actually being worked on, or did an old task just remain marked active?”

However, agent chat logs are never canonical project state.

Use the Issue / PR as the durable handoff surface.

---

# 18. Search behavior

Search is global across:

- projects
- issues / work items
- PRs / artifacts
- targets
- machines / devices
- endpoints
- tags
- verification recipes

Keyboard behavior:

```text
/               focus search
Cmd/Ctrl + K    command/search palette
Esc             close
Enter           open best result
```

Useful quick filters:

```text
is:blocked
is:review
is:testable
project:movi
kind:server
kind:device
env:production
```

Do not build a large query language in v1. These can initially be simple tokens.

---

# 19. Connection ledger rules

The connection ledger is useful but potentially sensitive.

## Safe to store

- service name
- public URL
- local logical hostname when portal is private
- port
- protocol
- environment
- network type
- docs link
- secret reference name

## Never store in public config

- passwords
- API tokens
- SSH private keys
- auth cookies
- raw `.env`
- recovery codes

## Public/private deployment decision

A page containing LAN or Tailnet topology should **not** be assumed public.

Use one of two modes:

### Public mode

Expose only public projects, public URLs, public repos, and sanitized operational metadata.

### Private mode

Put the portal behind authentication such as Cloudflare Access and allow private machine / endpoint metadata.

The build should make this distinction explicit rather than relying on someone remembering to hide a field.

---

# 20. Visual design rules

The design should feel like an instrument panel, not a SaaS admin console.

## Prefer

- compact cards
- strong section hierarchy
- readable status badges
- monospace for endpoints / commands
- copy buttons
- relative freshness (`18m ago`) with exact timestamp on hover
- short next-action text
- keyboard navigation
- dark/light support if cheap

## Avoid

- giant hero sections
- vanity graphs
- pie charts
- decorative charts with no action attached
- large project logos
- excessive animations
- modal-heavy navigation
- fake real-time indicators
- dozens of colors

Color should encode exceptional state, not decorate everything.

Suggested semantic categories:

```text
neutral   ready / metadata
active    in progress
review    needs acceptance
warning   blocked / degraded
failure   verification failed / offline when relevant
success   verified / healthy
```

Do not rely on color alone; always include text/icon meaning.

---

# 21. Freshness and staleness

A current-state portal becomes dangerous when stale information looks current.

Each important object should expose freshness.

```ts
type Freshness = {
  sourceUpdatedAt?: string
  collectedAt: string
  staleAfterSeconds?: number
}
```

Example behavior:

```text
GitHub issue state: collected 2m ago
health signal: stale after 60s
manual hardware note: updated 3d ago
```

When data is stale, show `STALE` or `UNKNOWN` rather than preserving a green `ONLINE` badge forever.

---

# 22. “Needs attention” derivation

The top section should be deterministic.

An item belongs in `Needs attention` if any of the following is true:

```text
state == blocked
verification == failing
state == review && human acceptance required
active item has no update for configured stale interval
required target is offline/degraded
```

Each attention item should contain a reason.

Bad:

```text
MOVI — WARNING
```

Good:

```text
MOVI — hardware verification waiting
Next: run Neon + ZeusCar test and attach evidence to PR #…
```

---

# 23. “Next action” is the most valuable field

A status without a next action often forces a context switch back into the Issue.

Where practical, every active or blocked item should expose exactly one immediate action.

Examples:

```text
Run real-device test
Review PR #40
Reproduce on M2 Max
Fix RevenueCat package binding
Compare Qwen split benchmark
Decide K0-F success threshold
```

Avoid project-plan prose.

The next action should be executable in one work session.

---

# 24. Implementation strategy

## Phase 0 — Static proof

Goal: validate information architecture.

```text
Vite
React
TypeScript
Tailwind CSS
local YAML/JSON only
Cloudflare Pages / Workers
```

Build one page with fake/seed data.

Do not add a database.

Do not add authentication unless private connection information is already included.

## Phase 1 — GitHub read projection

Add:

- configured repository list
- Issues
- PRs
- state labels
- links
- timestamps

Generate `snapshot.json`.

Portal remains read-only.

## Phase 2 — Operational targets

Add:

- manually declared targets
- launch/open links
- verification recipes
- connection metadata

This is likely the point where the page becomes genuinely useful for eightman.

## Phase 3 — Advisory live signals

Add selected probes:

- HTTP health
- CI result
- deployment result
- optional machine heartbeat

Keep the distinction between `observed availability` and `work state` strict.

## Phase 4 — Agent integration

Only after the projection is trustworthy:

- expose machine-readable snapshot endpoint
- let agents query the same normalized state
- optionally offer safe actions such as `open issue`, `open PR`, `copy launch command`

Do not start by turning the portal into an orchestration control plane.

---

# 25. Minimum viable screen for eightman

If only one screen is implemented, build this:

```text
┌─────────────────────────────────────────────────────────────────┐
│ eightman Development                            refreshed 21:42 │
│ Kamimusuhi · MOVI · OISINT · Infra · Research                  │
├─────────────────────────────────────────────────────────────────┤
│ NEEDS ATTENTION                                                 │
│ [project] reason                              next action       │
│ [project] reason                              next action       │
├─────────────────────────────────────────────────────────────────┤
│ NOW                                                             │
│ [project] work item                  state        next action   │
│ [project] work item                  state        next action   │
│ [project] work item                  state        next action   │
├─────────────────────────────────────────────────────────────────┤
│ TRY / VERIFY NOW                                                │
│ target              kind      availability       [open/verify] │
│ target              kind      availability       [open/verify] │
├─────────────────────────────────────────────────────────────────┤
│ SYSTEMS                                                         │
│ machine/device      network   availability        updated      │
├─────────────────────────────────────────────────────────────────┤
│ / Search projects, tasks, targets, machines, endpoints...      │
└─────────────────────────────────────────────────────────────────┘
```

Connections and completed/archive work can live below this.

---

# 26. Acceptance criteria

The v1 is successful if, after being away from development, the user can answer all of these without reading chat history:

1. What are the 3–7 things currently moving?
2. What is blocked and why?
3. What needs human review or physical verification?
4. What can be opened or run right now?
5. Which machine / device / environment is required?
6. Where is the canonical Issue / PR?
7. What is the next concrete action?
8. How fresh is this information?

Additionally:

- no credentials are exposed
- GitHub remains source of truth for work state
- runtime health cannot silently rewrite project state
- stale data is visibly stale
- no fake progress percentages are required
- the first useful screen works on desktop without deep navigation
- search works from the keyboard

---

# 27. Explicit non-goals

The portal is **not**:

- Jira
- Linear
- GitHub Issues replacement
- GitHub PR replacement
- secret manager
- Grafana
- uptime monitoring platform
- SSH client
- deployment control plane
- AI chat UI
- agent transcript viewer
- long-term analytics warehouse
- automatic project manager

It is an **orientation and execution surface** above those systems.

---

# 28. Design invariants

These should survive future redesigns.

### Invariant 1

**One fact has one canonical owner.**

The portal projects; it does not duplicate.

### Invariant 2

**Work state, verification state, and runtime availability are separate axes.**

### Invariant 3

**Current attention outranks historical completeness.**

### Invariant 4

**A blocker without an unblock condition is incomplete information.**

### Invariant 5

**A runnable/testable thing is a first-class object, not just a link buried inside a task.**

### Invariant 6

**Observed machine health is advisory, not project truth.**

### Invariant 7

**Stale information must look stale.**

### Invariant 8

**The page should reduce context switching.**

If a piece of information simply sends the user hunting through three other places, improve the projection.

### Invariant 9

**The default action is to open the canonical source or run/verify the target — not to edit the portal.**

### Invariant 10

**The portal must remain useful without AI.**

AI can summarize or rank later, but the underlying state model must be deterministic and inspectable.

---

# 29. Final distillation

Sumi's visible page can be summarized as:

> **“開発の現在地”を、読むためではなく次の行動へ入るために見せる。**

For eightman, the stronger version is:

> **GitHubの作業状態、実際に触れる成果物、実機検証、ローカル/分散計算資源、接続先を、真実の出所を壊さず一枚に圧縮する。**

Or, even shorter:

> **進捗表ではなく、開発再開装置。**

That is the product to build.
