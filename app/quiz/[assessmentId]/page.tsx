import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { submitAssessment } from "@/lib/assessments/actions";

type Question = { id: string; position: number; type: "mcq" | "short"; prompt: string; options: string[] | null; points: number };
type Props = { params: Promise<{ assessmentId: string }>; searchParams: Promise<{ error?: string }> };
const MESSAGES: Record<string, string> = {
  attempts_exhausted: "You have used all attempts for this quiz.",
  not_enrolled: "Enroll in the course to take this quiz.",
  not_found: "This quiz is not available.",
  invalid_answers: "Your answers could not be read. Please try again.",
  failed: "Your quiz could not be submitted. Please try again.",
};

export default async function QuizPage({ params, searchParams }: Props) {
  const { assessmentId } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(assessmentId)) notFound();
  const { supabase } = await requireUser();

  const { data } = await supabase.from("assessments")
    .select("id, title, pass_threshold, max_attempts, courses(id, slug, title)").eq("id", assessmentId).maybeSingle();
  if (!data) notFound();
  const a = data as unknown as { id: string; title: string; pass_threshold: number; max_attempts: number | null; courses: { id: string; slug: string; title: string } };

  const { data: enr } = await supabase.from("enrollments").select("id").eq("course_id", a.courses.id).maybeSingle();
  if (!enr) redirect(`/courses/${a.courses.slug}`);

  const [{ data: qs }, { data: att }] = await Promise.all([
    supabase.from("assessment_questions").select("id, position, type, prompt, options, points").eq("assessment_id", a.id).order("position"),
    supabase.from("assessment_attempts").select("id, score_percent, passed, submitted_at").eq("assessment_id", a.id).order("submitted_at", { ascending: false }),
  ]);
  const questions = (qs ?? []) as Question[];
  const attempts = (att ?? []) as { id: string; score_percent: number; passed: boolean; submitted_at: string }[];
  const left = a.max_attempts === null ? null : Math.max(0, a.max_attempts - attempts.length);
  const locked = left === 0;
  const input = "mt-2 w-full rounded-md border border-current/30 bg-transparent p-2";

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/quizzes" className="text-sm underline">← All quizzes</Link>
      <h1 className="mt-2 text-3xl font-semibold">{a.title}</h1>
      <p className="mt-1 text-sm opacity-70">{a.courses.title} · pass mark {a.pass_threshold}%{left !== null ? ` · ${left} attempt(s) left` : " · unlimited attempts"}</p>
      {sp.error && <p role="alert" className="mt-4 rounded-md border border-red-700/50 p-3 text-sm text-red-700">{MESSAGES[sp.error] ?? MESSAGES.failed}</p>}

      {locked ? <p className="mt-6">No attempts left.</p> : questions.length === 0 ? <p className="mt-6">This quiz has no questions yet.</p> : (
        <form action={submitAssessment} className="mt-6 space-y-8">
          <input type="hidden" name="assessmentId" value={a.id} />
          {questions.map((q) => (
            <fieldset key={q.id}>
              <legend className="whitespace-pre-wrap font-medium">{q.position}. {q.prompt}</legend>
              {q.type === "mcq" ? (
                <div className="mt-2 space-y-1">
                  {(q.options ?? []).map((o, i) => (
                    <label key={i} className="flex items-start gap-2 text-sm">
                      <input type="radio" name={`q_${q.id}`} value={i} className="mt-1" /><span>{o}</span>
                    </label>))}
                </div>
              ) : <input type="text" name={`q_${q.id}`} maxLength={200} autoComplete="off" aria-label={`Answer to question ${q.position}`} className={input} />}
            </fieldset>
          ))}
          <p className="text-sm opacity-70">Unanswered questions count as incorrect. Answers and scores are checked on the server.</p>
          <button className="rounded-md bg-blue-800 px-4 py-2 font-medium text-white">Submit answers</button>
        </form>
      )}

      {attempts.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Your attempts</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {attempts.map((t) => (
              <li key={t.id}><Link href={`/quiz/${a.id}/attempt/${t.id}`} className="underline">
                {new Date(t.submitted_at).toISOString().replace("T", " ").slice(0, 16)} UTC</Link> · {Number(t.score_percent)}% · {t.passed ? "passed" : "not passed"}</li>))}
          </ul>
        </section>
      )}
    </main>
  );
}
