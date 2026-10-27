export type RunResult =
  | { ok: true; status: string; statusId: number; stdout: string; stderr: string; compileOutput: string; timeSec: number | null; memoryKb: number | null }
  | { ok: false; reason: "unconfigured" | "rate_limited" | "invalid" | "unavailable" | "timeout"; message: string };
