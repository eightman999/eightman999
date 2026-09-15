# External Agent Policy

This repository uses multiple coding agents.

## Shared harness / claim protocol

For substantive implementation work tied to a GitHub Issue, workers should claim the task before editing when multiple agents may run concurrently.

Use `scripts/harness.mjs`:

```bash
node scripts/harness.mjs claim OWNER/REPO ISSUE \
  --worker MODEL/HARNESS/SESSION \
  --harness HARNESS \
  --model MODEL \
  --transport local \
  --session SESSION \
  --worktree "$PWD"
```

Rules:
- GitHub Issues remain the canonical record of the desired outcome and assignment context.
- GitHub PRs remain the canonical record of implementation and verification.
- The harness ledger records only temporary execution ownership.
- Keep `model`, `harness`, `transport`, and `session` conceptually separate.
- Long-running work should renew its lease.
- An expired lease is NOT permission to silently steal a task. Inspect the old session/worktree/PRs, then use `reclaim --evidence ...`.
- Release with `review`, `ready`, `blocked`, `done`, or `abandoned` as appropriate.
- The v0 ledger is local-per-host, not a distributed lock across machines.

See `docs/HARNESS.md`.

## Agy / Antigravity CLI

Default role:
- read-only audit
- requirements checking
- documentation consistency
- long-context scan
- log and diff compression

Default prompt:

```text
Read the mission, CLAUDE.md, AGENTS.md, README, and relevant docs.
Do not edit files.
Return:
1. conclusion
2. hidden assumptions
3. contradictions
4. affected files
5. risks
6. recommended next action
```

Rules:
- Agy is NOT a primary implementation worker.
- If Agy must implement something, isolate it in a separate branch/worktree first.

## OpenCode(GLM)

Default role:
- secondary implementation lane
- independent patch attempt
- scoped feature work
- tests and refactors

Rules:
- Prefer separate git worktree
- Keep changes minimal
- Do not redesign unrelated systems
- Do not use `/share` (never share private repository content publicly)
- Return changed files, tests run, risks, and unresolved questions

Suggested worktree flow:

```bash
git worktree add ../PROJECT-glm -b glm/TASK_NAME
cd ../PROJECT-glm
opencode
```

## Codex

Default role:
- peer senior engineer
- rescue
- adversarial review
- independent second opinion

Use cases:
- hard bug
- design challenge
- security-sensitive review
- Claude loop recovery
- final review before risky merge

Rules:
- Do not enable an always-on review gate by default.
- Use Codex on high-risk decisions only when the extra cost is justified.

## Required final report (all external agents)

1. conclusion / approach summary
2. changed files (if any)
3. tests run and their actual output
4. risks
5. unresolved questions
