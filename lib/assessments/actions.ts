"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";

const KNOWN_ERRORS = ["not_enrolled", "attempts_exhausted", "not_found", "invalid_answers", "empty_assessment"] as const;

export async function submitAssessment(form: FormData) {
  const id = z.string().uuid().safeParse(form.get("assessmentId"));
  if (!id.success) redirect("/quizzes");
  const { supabase } = await requireUser();

  // Only the browser's raw answers are sent. Scoring, correctness and pass/fail are decided in the database.
  const answers: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    const m = /^q_([0-9a-f-]{36})$/.exec(key);
    if (m && typeof value === "string") answers[m[1]] = value.slice(0, 200);
  }

  const { data, error } = await supabase.rpc("submit_assessment", { p_assessment_id: id.data, p_answers: answers });
  if (error) {
    const code = KNOWN_ERRORS.find((c) => error.message.includes(c)) ?? "failed";
    redirect(`/quiz/${id.data}?error=${code}`);
  }
  redirect(`/quiz/${id.data}/attempt/${data as string}`);
}
