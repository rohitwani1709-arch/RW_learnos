import Link from "next/link";
import { requireUser } from "@/lib/auth/session";

type Row = { id: string; title: string; kind: string; pass_threshold: number; max_attempts: number | null; courses: { id: string; title: string } };
export const metadata = { title: "Quizzes | LearnOS" };

export default async function Quizzes() {
  const { supabase } = await requireUser();
  const [{ data: enr }, { data: aData, error }, { data: att }] = await Promise.all([
    supabase.from("enrollments").select("course_id"),
    supabase.from("assessments").select("id, title, kind, pass_threshold, max_attempts, courses(id, title)").order("title"),
    supabase.from("assessment_attempts").select("assessment_id, score_percent, passed"),
  ]);
  const enrolled = new Set((enr ?? []).map((e: { course_id: string }) => e.course_id));
  const rows = ((aData ?? []) as unknown as Row[]).filter((a) => enrolled.has(a.courses.id));
  const attempts = (att ?? []) as { assessment_id: string; score_percent: number; passed: boolean }[];

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Quizzes</h1>
      {error && <p role="alert" className="mt-6 text-red-700">Quizzes could not be loaded.</p>}
      {!error && rows.length === 0 && <p className="mt-6 opacity-75">No quizzes yet. Enroll in a course from the <Link href="/courses" className="underline">catalog</Link>.</p>}
      <ul className="mt-8 space-y-4">
        {rows.map((a) => {
          const mine = attempts.filter((t) => t.assessment_id === a.id);
          const best = mine.length ? Math.max(...mine.map((t) => Number(t.score_percent))) : null;
          return (
            <li key={a.id} className="rounded-lg border border-current/20 p-5">
              <Link href={`/quiz/${a.id}`} className="text-lg font-medium hover:underline">{a.title}</Link>
              <p className="mt-1 text-sm opacity-70">{a.courses.title} · pass mark {a.pass_threshold}%{a.max_attempts ? ` · ${a.max_attempts} attempt(s) allowed` : ""}</p>
              <p className="mt-2 text-sm">{best === null ? "Not attempted yet." : `Best score ${best}% after ${mine.length} attempt(s)${mine.some((t) => t.passed) ? " · passed" : " · not passed yet"}.`}</p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
