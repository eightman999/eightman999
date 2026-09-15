#!/usr/bin/env node
import { hostname, homedir } from "node:os";
import { basename, join } from "node:path";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";

const DEFAULT_LEASE_MINUTES = 180;
const ROOT =
  process.env.EIGHTMAN_HARNESS_DIR ||
  join(
    process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"),
    "eightman",
    "harness",
  );
const RELEASE_REASONS = new Set([
  "ready",
  "review",
  "blocked",
  "done",
  "abandoned",
]);

class HarnessError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function abort(message, exitCode = 1) {
  throw new HarnessError(message, exitCode);
}

function usage() {
  abort(`usage:
  harness claim <repo> <issue> --worker ID --harness NAME
          [--model NAME] [--transport NAME] [--session ID]
          [--worktree PATH] [--lease-minutes N] [--note TEXT]
  harness renew <repo> <issue> --worker ID [--lease-minutes N]
  harness release <repo> <issue> --worker ID
          --reason ready|review|blocked|done|abandoned [--note TEXT]
  harness reclaim <repo> <issue> --worker ID --harness NAME
          --evidence TEXT [--model NAME] [--transport NAME]
          [--session ID] [--worktree PATH] [--lease-minutes N]
  harness show <repo> <issue> [--json]
  harness list [--repo OWNER/NAME] [--json]
  harness snapshot [--repo OWNER/NAME] [--public]

Local per-host ledger only. GitHub Issues/PRs remain project truth.`);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json" || arg === "--public") {
      out[arg.slice(2)] = true;
    } else if (arg.startsWith("--")) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith("--")) usage();
      out[arg.slice(2)] = argv[++i];
    } else {
      out._.push(arg);
    }
  }
  return out;
}

function slug(repo) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || "")) abort(`invalid repo: ${repo}`);
  return repo.replace("/", "__");
}

function issueNumber(value) {
  if (!/^\d+$/.test(value || "")) usage();
  return Number(value);
}

function pathFor(repo, issue) {
  return join(ROOT, `${slug(repo)}--${issue}.json`);
}

function lockPath(repo, issue) {
  return `${pathFor(repo, issue)}.lock`;
}

function now() {
  return new Date();
}

function iso(date) {
  return date.toISOString();
}

function expired(record, at = now()) {
  return !record?.leaseExpiresAt || Date.parse(record.leaseExpiresAt) <= at.getTime();
}

function leaseMinutes(args) {
  const minutes = Number(args["lease-minutes"] ?? DEFAULT_LEASE_MINUTES);
  if (!Number.isFinite(minutes) || minutes <= 0) usage();
  return minutes;
}

async function ensureRoot() {
  await mkdir(ROOT, { recursive: true });
}

async function readRecord(repo, issue) {
  try {
    return JSON.parse(await readFile(pathFor(repo, issue), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function atomicWrite(repo, issue, record) {
  const target = pathFor(repo, issue);
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(record, null, 2)}\n`);
  await rename(tmp, target);
}

async function withLock(repo, issue, fn) {
  await ensureRoot();
  const lock = lockPath(repo, issue);
  try {
    await mkdir(lock);
  } catch (error) {
    if (error.code === "EEXIST") {
      abort(`claim record is busy for ${repo}#${issue}`, 3);
    }
    throw error;
  }

  try {
    return await fn();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}

function appendHistory(record, event, worker, note) {
  record.history = [
    ...(record.history || []),
    { at: iso(now()), event, worker, ...(note ? { note } : {}) },
  ].slice(-50);
}

function newClaim(args, repo, issue) {
  const at = now();
  const minutes = leaseMinutes(args);
  return {
    repo,
    issue,
    state: "claimed",
    worker: args.worker,
    harness: args.harness,
    model: args.model || null,
    transport: args.transport || null,
    session: args.session || null,
    host: hostname(),
    pid: process.ppid,
    worktree: args.worktree || process.cwd(),
    claimedAt: iso(at),
    heartbeatAt: iso(at),
    leaseExpiresAt: iso(new Date(at.getTime() + minutes * 60_000)),
    lastReason: null,
    history: [],
  };
}

function publicRecord(record) {
  return {
    repo: record.repo,
    issue: record.issue,
    state: record.state,
    worker: record.worker,
    harness: record.harness,
    model: record.model,
    transport: record.transport,
    worktree: record.worktree ? basename(record.worktree) : null,
    claimedAt: record.claimedAt,
    heartbeatAt: record.heartbeatAt,
    leaseExpiresAt: record.leaseExpiresAt,
    expired: record.state === "claimed" && expired(record),
    lastReason: record.lastReason,
  };
}

async function claim(args, reclaim = false) {
  const repo = args._[1];
  const issue = issueNumber(args._[2]);
  if (!args.worker || !args.harness) usage();
  if (reclaim && !args.evidence) usage();

  await withLock(repo, issue, async () => {
    const previous = await readRecord(repo, issue);

    if (previous?.state === "claimed" && !expired(previous)) {
      abort(
        `${repo}#${issue} already claimed by ${previous.worker} via ${previous.harness} until ${previous.leaseExpiresAt}`,
        3,
      );
    }

    if (previous?.state === "claimed" && expired(previous) && !reclaim) {
      abort(
        `${repo}#${issue} has an expired claim by ${previous.worker}; inspect it, then use reclaim --evidence ...`,
        3,
      );
    }

    const record = newClaim(args, repo, issue);
    if (previous) record.history = previous.history || [];

    appendHistory(
      record,
      reclaim ? "reclaim" : "claim",
      args.worker,
      reclaim
        ? `evidence: ${args.evidence}${args.note ? ` — ${args.note}` : ""}`
        : args.note,
    );

    await atomicWrite(repo, issue, record);
    console.log(
      `${reclaim ? "reclaimed" : "claimed"} ${repo}#${issue} worker=${record.worker} harness=${record.harness} lease-until=${record.leaseExpiresAt}`,
    );
  });
}

async function renew(args) {
  const repo = args._[1];
  const issue = issueNumber(args._[2]);
  if (!args.worker) usage();

  await withLock(repo, issue, async () => {
    const record = await readRecord(repo, issue);
    if (!record || record.state !== "claimed" || record.worker !== args.worker) {
      abort(`no matching claim for ${repo}#${issue}`, 3);
    }

    const at = now();
    record.heartbeatAt = iso(at);
    record.leaseExpiresAt = iso(
      new Date(at.getTime() + leaseMinutes(args) * 60_000),
    );
    appendHistory(record, "renew", args.worker);
    await atomicWrite(repo, issue, record);
    console.log(`renewed ${repo}#${issue} until ${record.leaseExpiresAt}`);
  });
}

async function release(args) {
  const repo = args._[1];
  const issue = issueNumber(args._[2]);
  if (!args.worker || !RELEASE_REASONS.has(args.reason)) usage();

  await withLock(repo, issue, async () => {
    const record = await readRecord(repo, issue);
    if (!record || record.state !== "claimed" || record.worker !== args.worker) {
      abort(`no matching claim for ${repo}#${issue}`, 3);
    }

    record.state = "released";
    record.lastReason = args.reason;
    record.releasedAt = iso(now());
    appendHistory(record, `release:${args.reason}`, args.worker, args.note);
    await atomicWrite(repo, issue, record);
    console.log(`released ${repo}#${issue} reason=${args.reason}`);
  });
}

async function records(repoFilter) {
  await ensureRoot();
  const files = (await readdir(ROOT)).filter((name) => name.endsWith(".json"));
  const out = [];

  for (const file of files) {
    try {
      const record = JSON.parse(await readFile(join(ROOT, file), "utf8"));
      if (!repoFilter || record.repo === repoFilter) out.push(record);
    } catch {
      // Ignore malformed/unrelated files; show/list must remain usable.
    }
  }

  return out.sort((a, b) =>
    (b.heartbeatAt || b.claimedAt).localeCompare(a.heartbeatAt || a.claimedAt),
  );
}

async function show(args) {
  const repo = args._[1];
  const issue = issueNumber(args._[2]);
  const record = await readRecord(repo, issue);
  if (!record) abort(`no record for ${repo}#${issue}`, 2);
  console.log(JSON.stringify(args.json ? record : publicRecord(record), null, 2));
}

async function list(args) {
  const all = await records(args.repo);
  if (args.json) {
    console.log(JSON.stringify(all, null, 2));
    return;
  }

  for (const record of all) {
    const lease =
      record.state === "claimed" ? (expired(record) ? "EXPIRED" : "live") : "-";
    console.log(
      `${record.state.padEnd(8)} ${record.repo}#${record.issue} ${String(record.worker || "-").padEnd(28)} ${String(record.harness || "-").padEnd(14)} ${lease} ${record.leaseExpiresAt || "-"}`,
    );
  }
}

async function snapshot(args) {
  const all = await records(args.repo);
  const sessions = args.public ? all.map(publicRecord) : all;
  console.log(JSON.stringify({ generatedAt: iso(now()), sessions }, null, 2));
}

try {
  const args = parseArgs(process.argv.slice(2));
  await ensureRoot();

  switch (args._[0]) {
    case "claim":
      await claim(args, false);
      break;
    case "reclaim":
      await claim(args, true);
      break;
    case "renew":
      await renew(args);
      break;
    case "release":
      await release(args);
      break;
    case "show":
      await show(args);
      break;
    case "list":
      await list(args);
      break;
    case "snapshot":
      await snapshot(args);
      break;
    default:
      usage();
  }
} catch (error) {
  if (error instanceof HarnessError) {
    console.error(`harness: ${error.message}`);
    process.exit(error.exitCode);
  }
  throw error;
}
