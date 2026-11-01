import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

type Props = { params: Promise<{ assessmentId: string; attemptId: string }> };
const UUID = /^[0-9a-f-]{36}$/;

export default async function AttemptPage({ params }: Props) {
  const { assessmentId, attemptId } = await params;
  if (!UUID.test(assessmentId) || !UUID.test(attemptId)) notFound();
  const { supabase } = await requireUser();

  // Row-level security returns the attempt only to its owner (or an admin).
  const { data: attempt } = await supabase.from("assessment_attempts")
    .select("id, assessment_id, points_earned, points_possible, score_percent, passed, submitted_at")
    .eq("id", attemptId).eq("assessment_id", assessmentId).maybeSingle();
  if (!attempt) notFound();

  const [{ data: a }, { data: ans }, { data: qs }] = await Promise.all([
    supabase.from("assessments").select("title, pass_threshold").eq("id", assessmentId).single(),
    supabase.from("assessment_answers").select("question_id, answer, is_correct, feedback").eq("attempt_id", attemptId),
    supabase.from("assessment_questions").select("id, position, prompt").eq("assessment_id", assessmentId).order("position"),
  ]);
  const byQ = new Map((ans ?? []).map((r: { question_id: string; answer: string; is_correct: boolean; feedback: string }) => [r.question_id, r]));
  const questions = (qs ?? []) as { id: string; position: number; prompt: string }[];

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href={`/quiz/${assessmentId}`} className="text-sm underline">← Back to the quiz</Link>
      <h1 className="mt-2 text-3xl font-semibold">{a?.title ?? "Quiz result"}</h1>
      <p role="status" className={`mt-4 text-xl font-semibold ${attempt.passed ? "text-green-800" : "text-red-700"}`}>
        {Number(attempt.score_percent)}% · {attempt.passed ? "Passed" : `Not passed (pass mark ${a?.pass_threshold ?? "?"}%)`}
      </p>
      <p className="text-sm opacity-70">{attempt.points_earned} of {attempt.points_possible} points</p>

      <ol className="mt-8 space-y-6">
        {questions.map((q) => {
          const r = byQ.get(q.id);
          return (
            <li key={q.id} className="rounded-lg border border-current/20 p-4">
              <p className="whitespace-pre-wrap font-medium">{q.position}. {q.prompt}</p>
              <p className="mt-2 text-sm">Your answer: {r?.answer ? r.answer : <em>no answer</em>}</p>
              <p className={`mt-1 text-sm font-medium ${r?.is_correct ? "text-green-800" : "text-red-700"}`}>{r?.is_correct ? "Correct" : "Incorrect"}</p>
              {r?.feedback && <p className="mt-1 text-sm opacity-80">{r.feedback}</p>}
            </li>
          );
        })}
      </ol>
      <Link href={`/quiz/${assessmentId}`} className="mt-8 inline-block rounded-md border border-current/30 px-4 py-2 text-sm">Try again</Link>
    </main>
  );
}
