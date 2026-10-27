import "server-only";
import type { RunResult } from "./types";

// Language allowlist: the browser never chooses a language id.
const LANGUAGE_IDS = { python: Number(process.env.JUDGE0_PYTHON_ID || 71) } as const;
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const unb64 = (s: string | null | undefined) => (s ? Buffer.from(s, "base64").toString("utf8") : "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function judge0Configured() {
  try { new URL(process.env.JUDGE0_BASE_URL ?? ""); return true; } catch { return false; }
}

function headers() {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.JUDGE0_API_KEY;
  if (key) h[process.env.JUDGE0_AUTH_HEADER || "X-Auth-Token"] = key;
  if (process.env.JUDGE0_HOST_HEADER) h["X-RapidAPI-Host"] = process.env.JUDGE0_HOST_HEADER;
  return h;
}

const unavailable = (message: string): RunResult => ({ ok: false, reason: "unavailable", message });

export async function runPython(code: string, stdin: string): Promise<RunResult> {
  const base = (process.env.JUDGE0_BASE_URL ?? "").replace(/\/+$/, "");
  try {
    const create = await fetch(`${base}/submissions?base64_encoded=true&wait=false`, {
      method: "POST",
      headers: headers(),
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        source_code: b64(code),
        language_id: LANGUAGE_IDS.python,
        stdin: b64(stdin),
        cpu_time_limit: 5,
        wall_time_limit: 10,
        memory_limit: 128000, // KB; the provider may enforce a lower cap
      }),
    });
    if (create.status === 429) return unavailable("The execution service quota is used up. Try again later.");
    if (!create.ok) return unavailable("The execution service rejected the request.");
    const { token } = (await create.json()) as { token?: string };
    if (!token || typeof token !== "string") return unavailable("The execution service returned an unexpected response.");

    for (let i = 0; i < 15; i++) {
      await sleep(700);
      const res = await fetch(
        `${base}/submissions/${encodeURIComponent(token)}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`,
        { headers: headers(), signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) return unavailable("Could not read the execution result.");
      const r = (await res.json()) as {
        status?: { id: number; description: string }; stdout?: string | null; stderr?: string | null;
        compile_output?: string | null; time?: string | null; memory?: number | null;
      };
      if (!r.status || typeof r.status.id !== "number") return unavailable("The execution service returned an unexpected response.");
      if (r.status.id <= 2) continue; // 1 = in queue, 2 = processing
      return {
        ok: true,
        status: r.status.description,
        statusId: r.status.id,
        stdout: unb64(r.stdout).slice(0, 10000),
        stderr: unb64(r.stderr).slice(0, 10000),
        compileOutput: unb64(r.compile_output).slice(0, 10000),
        timeSec: r.time ? Number(r.time) : null,
        memoryKb: typeof r.memory === "number" ? r.memory : null,
      };
    }
    return { ok: false, reason: "timeout", message: "The program did not finish in time." };
  } catch {
    return unavailable("The execution service could not be reached.");
  }
}
