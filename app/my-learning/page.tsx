import Link from "next/link";
import { requireUser } from "@/lib/auth/session";

type L = { id: string; slug: string; position: number };
type M = { position: number; lessons: L[] };
type Row = { courses: { id: string; slug: string; title: string; course_modules: M[] } };

export const metadata = { title: "My learning | LearnOS" };

export default async function MyLearning() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("enrollments")
    .select("courses(id, slug, title, course_modules(position, lessons(id, slug, position)))")
    .order("enrolled_at", { ascending: false });
  const rows = (data ?? []) as unknown as Row[];
  const { data: done } = await supabase.from("lesson_progress").select("lesson_id");
  const doneIds = new Set((done ?? []).map((r: { lesson_id: string }) => r.lesson_id));

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">My learning</h1>
      {error && <p role="alert" className="mt-6 text-red-700">Your courses could not be loaded.</p>}
      {!error && rows.length === 0 && (
        <p className="mt-6 opacity-75">You are not enrolled in any course yet. <Link href="/courses" className="underline">Browse courses</Link>.</p>
      )}
      <ul className="mt-8 space-y-4">
        {rows.map(({ courses: c }) => {
          const flat = [...c.course_modules].sort((a, b) => a.position - b.position)
            .flatMap((m) => [...m.lessons].sort((a, b) => a.position - b.position));
          const completed = flat.filter((l) => doneIds.has(l.id)).length;
          const nextLesson = flat.find((l) => !doneIds.has(l.id)) ?? flat[0];
          const pct = flat.length ? Math.round((completed / flat.length) * 100) : 0;
          return (
            <li key={c.id} className="rounded-lg border border-current/20 p-5">
              <Link href={`/courses/${c.slug}`} className="text-lg font-medium hover:underline">{c.title}</Link>
              <progress value={pct} max={100} aria-label={`${c.title} progress`} className="mt-3 block w-full" />
              <p className="mt-1 text-sm opacity-70">{completed} of {flat.length} lessons complete ({pct}%)</p>
              {nextLesson && (
                <Link href={`/learn/${c.slug}/${nextLesson.slug}`} className="mt-3 inline-block rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white">
                  {completed === 0 ? "Start learning" : "Continue"}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
