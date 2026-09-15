import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const harness = resolve("scripts/harness.mjs");

async function fixture() {
  return mkdtemp(join(tmpdir(), "eightman-harness-"));
}

function run(dir, args) {
  return spawnSync(process.execPath, [harness, ...args], {
    encoding: "utf8",
    env: { ...process.env, EIGHTMAN_HARNESS_DIR: dir }
  });
}

test("claim rejects a second live claimant", async () => {
  const dir = await fixture();
  const first = run(dir, [
    "claim", "eightman999/kamimusuhi", "40",
    "--worker", "opus/claude-code/a",
    "--harness", "claude-code",
    "--model", "opus",
    "--session", "a",
    "--worktree", "/tmp/private/kamimusuhi-a"
  ]);
  assert.equal(first.status, 0, first.stderr);

  const second = run(dir, [
    "claim", "eightman999/kamimusuhi", "40",
    "--worker", "gpt/codex/b",
    "--harness", "codex",
    "--session", "b"
  ]);
  assert.equal(second.status, 3);
  assert.match(second.stderr, /already claimed/);
});

test("release preserves history and allows a later claim", async () => {
  const dir = await fixture();
  assert.equal(run(dir, [
    "claim", "eightman999/project-movi", "2",
    "--worker", "opus/claude-code/a",
    "--harness", "claude-code"
  ]).status, 0);

  assert.equal(run(dir, [
    "release", "eightman999/project-movi", "2",
    "--worker", "opus/claude-code/a",
    "--reason", "review",
    "--note", "PR ready"
  ]).status, 0);

  const next = run(dir, [
    "claim", "eightman999/project-movi", "2",
    "--worker", "gpt/codex/b",
    "--harness", "codex"
  ]);
  assert.equal(next.status, 0, next.stderr);

  const record = JSON.parse(
    await readFile(join(dir, "eightman999__project-movi--2.json"), "utf8")
  );
  assert.ok(record.history.some((event) => event.event === "release:review"));
  assert.equal(record.worker, "gpt/codex/b");
});

test("public snapshot strips host, pid and full worktree path", async () => {
  const dir = await fixture();
  assert.equal(run(dir, [
    "claim", "eightman999/YLSB", "9",
    "--worker", "gpt/codex/bench",
    "--harness", "codex",
    "--transport", "cc-workers",
    "--worktree", "/Users/private/secret/YLSB-bench"
  ]).status, 0);

  const snapshot = run(dir, ["snapshot", "--public"]);
  assert.equal(snapshot.status, 0, snapshot.stderr);
  const parsed = JSON.parse(snapshot.stdout);
  const session = parsed.sessions[0];
  assert.equal(session.worktree, "YLSB-bench");
  assert.equal(session.transport, "cc-workers");
  assert.ok(!("host" in session));
  assert.ok(!("pid" in session));
  assert.ok(!snapshot.stdout.includes("/Users/private/secret"));
});
