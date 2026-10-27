"use server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { judge0Configured, runPython } from "./judge0";
import { allow } from "./rate-limit";
import type { RunResult } from "./types";

const schema = z.object({ code: z.string().min(1).max(20000), stdin: z.string().max(5000) });

export async function runCode(input: { code: string; stdin: string }): Promise<RunResult> {
  const { supabase, user } = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid", message: "Code must be 1 to 20,000 characters and input at most 5,000." };
  if (!judge0Configured()) return { ok: false, reason: "unconfigured", message: "Code execution is not configured on this server." };
  if (!allow(user.id)) return { ok: false, reason: "rate_limited", message: "Too many runs. Wait a minute and try again." };

  const result = await runPython(parsed.data.code, parsed.data.stdin);
  if (result.ok) {
    const { error } = await supabase.from("code_submissions").insert({
      user_id: user.id, language: "python", source_code: parsed.data.code, stdin: parsed.data.stdin,
      status: result.status, stdout: result.stdout, stderr: result.stderr || result.compileOutput, time_sec: result.timeSec,
    });
    if (error) console.error("Saving submission history failed:", error.code);
  }
  return result;
}
