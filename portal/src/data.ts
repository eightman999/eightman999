export type WorkState = "ready" | "in-progress" | "review" | "blocked" | "done";
export type VerificationState = "none" | "available" | "required" | "passed" | "failed";
export type RuntimeState = "online" | "offline" | "manual" | "unknown";

export type WorkItem = {
  id: string;
  project: string;
  title: string;
  workState: WorkState;
  verification: VerificationState;
  nextAction: string;
  blocker?: string;
  href?: string;
  updated: string;
};

export type Target = {
  id: string;
  project: string;
  name: string;
  kind: "web" | "api" | "device" | "server" | "experiment";
  runtime: RuntimeState;
  verification: VerificationState;
  action: string;
  href?: string;
  note?: string;
};

export const work: WorkItem[] = [
  {
    id: "kamimusuhi-k0f",
    project: "Kamimusuhi",
    title: "K0-F + CX + runtime integration",
    workState: "in-progress",
    verification: "required",
    nextAction: "Close the loop between persistent state, language invocation and the next K0 action.",
    href: "https://github.com/eightman999/kamimusuhi",
    updated: "2026-09-15"
  },
  {
    id: "movi-neon",
    project: "MOVI",
    title: "Pupil Neon → gaze-as-evidence intent pipeline",
    workState: "in-progress",
    verification: "available",
    nextAction: "Run the real-hardware capture and validate evidence accumulation before motor integration.",
    href: "https://github.com/eightman999/project-movi",
    updated: "2026-09-15"
  },
  {
    id: "oisint-store",
    project: "OISINT",
    title: "Store / billing release path",
    workState: "blocked",
    verification: "required",
    blocker: "Store-side configuration remains the release-critical dependency.",
    nextAction: "Resolve store configuration, then perform a real-store billing test.",
    href: "https://oisint.com",
    updated: "2026-09-15"
  },
  {
    id: "llm-distributed",
    project: "LLM Infra",
    title: "Heterogeneous / distributed local inference",
    workState: "in-progress",
    verification: "available",
    nextAction: "Measure a model that actually benefits from combining Mac unified memory and CUDA hosts.",
    href: "https://github.com/eightman999/YLSB",
    updated: "2026-09-15"
  }
];

export const targets: Target[] = [
  {
    id: "movi-neon-device",
    project: "MOVI",
    name: "Pupil Neon",
    kind: "device",
    runtime: "manual",
    verification: "available",
    action: "Capture gaze/head streams and feed the intent estimator.",
    note: "Real-hardware verification surface."
  },
  {
    id: "movi-zeuscar",
    project: "MOVI",
    name: "ZeusCar",
    kind: "device",
    runtime: "manual",
    verification: "required",
    action: "Use only after the intent pipeline passes offline / lifted-wheel checks."
  },
  {
    id: "llm-master",
    project: "LLM Infra",
    name: "llm_master",
    kind: "server",
    runtime: "unknown",
    verification: "available",
    action: "Probe the OpenAI-compatible endpoint, then run the target benchmark.",
    note: "Private endpoint intentionally not stored in this public repository."
  },
  {
    id: "p100-server",
    project: "LLM Infra",
    name: "P100 multi-GPU server",
    kind: "server",
    runtime: "unknown",
    verification: "available",
    action: "Check reachability and free VRAM before scheduling a large-model run.",
    note: "Connection details stay private."
  },
  {
    id: "oisint-web",
    project: "OISINT",
    name: "OISINT Web",
    kind: "web",
    runtime: "online",
    verification: "available",
    action: "Open production and verify the search path.",
    href: "https://oisint.com"
  }
];
