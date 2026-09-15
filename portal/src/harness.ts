export type HarnessLane = {
  id: string;
  name: string;
  role: string;
  mutation: "write" | "scoped" | "read-only";
  transport: string;
  note: string;
};

export const harnessLanes: HarnessLane[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    role: "Primary implementation",
    mutation: "write",
    transport: "local / remote shell",
    note: "Main repository implementation lane; claim an Issue before concurrent work."
  },
  {
    id: "codex",
    name: "Codex",
    role: "Peer engineer / rescue / adversarial review",
    mutation: "scoped",
    transport: "cc-workers / connector",
    note: "Use for hard bugs, independent review, risky design and recovery."
  },
  {
    id: "opencode",
    name: "OpenCode",
    role: "Secondary implementation",
    mutation: "write",
    transport: "cc-workers / local",
    note: "Prefer an isolated worktree; never become final authority for integration."
  },
  {
    id: "agy",
    name: "Agy / Antigravity",
    role: "Audit / long-context consistency",
    mutation: "read-only",
    transport: "cc-workers",
    note: "Requirements, documentation, contradictions and log/diff compression."
  },
  {
    id: "devin",
    name: "Devin",
    role: "Long-running delegated implementation",
    mutation: "write",
    transport: "cloud",
    note: "Good for bounded work that can progress independently and report back through PRs."
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    role: "Orchestration / synthesis / integration",
    mutation: "scoped",
    transport: "interactive / connectors",
    note: "Keep project truth in GitHub; use harness state only for temporary execution ownership."
  }
];
