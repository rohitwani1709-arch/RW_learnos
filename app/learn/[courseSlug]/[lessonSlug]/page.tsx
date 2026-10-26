import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { requireUser } from "@/lib/auth/session";
import { setLessonComplete } from "@/lib/courses/progress";

type Lesson = { id: string; slug: string; title: string; position: number; estimated_minutes: number };
type Mod = { id: string; title: string; position: number; lessons: Lesson[] };
type Props = { params: Promise<{ courseSlug: string; lessonSlug: string }>; searchParams: Promise<{ error?: string }> };

export default async function LessonPage({ params, searchParams }: Props) {
  const { courseSlug, lessonSlug } = await params;
  const sp = await searchParams;
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("courses")
    .select("id, slug, title, course_modules(id, title, position, lessons(id, slug, title, position, estimated_minutes))")
    .eq("slug", courseSlug).maybeSingle();
  if (!data) notFound();
  const course = data as unknown as { id: string; slug: string; title: string; course_modules: Mod[] };

  const { data: enrollment } = await supabase.from("enrollments").select("id").eq("course_id", course.id).maybeSingle();
  if (!enrollment) redirect(`/courses/${course.slug}`);

  const modules = [...course.course_modules].sort((a, b) => a.position - b.position)
    .map((m) => ({ ...m, lessons: [...m.lessons].sort((a, b) => a.position - b.position) }));
  const flat = modules.flatMap((m) => m.lessons);
  const idx = flat.findIndex((l) => l.slug === lessonSlug);
  if (idx < 0) notFound();
  const lesson = flat[idx];
  const prev = flat[idx - 1];
  const next = flat[idx + 1];

  const [{ data: body }, { data: done }] = await Promise.all([
    supabase.from("lessons").select("content_md").eq("id", lesson.id).single(),
    supabase.from("lesson_progress").select("lesson_id").in("lesson_id", flat.map((l) => l.id)),
  ]);
  const doneIds = new Set((done ?? []).map((r: { lesson_id: string }) => r.lesson_id));
  const isDone = doneIds.has(lesson.id);

  const md = "[&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1 [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-black/10 [&_pre]:p-4 [&_pre]:text-sm [&_code]:font-mono [&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-black/10 [&_:not(pre)>code]:px-1";

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-8 md:grid-cols-[18rem_1fr]">
      <nav aria-label="Course lessons" className="text-sm md:sticky md:top-4 md:self-start">
        <Link href={`/courses/${course.slug}`} className="font-semibold hover:underline">{course.title}</Link>
        <p className="mt-1 opacity-70">{flat.filter((l) => doneIds.has(l.id)).length} of {flat.length} lessons complete</p>
        {modules.map((m) => (
          <div key={m.id} className="mt-4">
            <p className="font-medium">{m.position}. {m.title}</p>
            {m.lessons.length === 0 ? <p className="opacity-60">No lessons yet</p> : (
              <ul className="mt-1 space-y-1">
                {m.lessons.map((l) => (
                  <li key={l.id}>
                    <Link href={`/learn/${course.slug}/${l.slug}`} aria-current={l.id === lesson.id ? "page" : undefined}
                      className={`block rounded px-2 py-1 hover:underline ${l.id === lesson.id ? "bg-blue-800/15 font-medium" : ""}`}>
                      <span aria-hidden>{doneIds.has(l.id) ? "✓ " : "○ "}</span>{l.title}
                      <span className="sr-only">{doneIds.has(l.id) ? " (completed)" : ""}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>

      <main>
        <h1 className="text-3xl font-semibold">{lesson.title}</h1>
        <p className="mt-1 text-sm opacity-70">{lesson.estimated_minutes} min read</p>
        <article className={md}><ReactMarkdown>{body?.content_md ?? ""}</ReactMarkdown></article>

        {sp.error && <p role="alert" className="mt-6 text-red-700">Progress could not be saved. Try again.</p>}
        <form action={setLessonComplete} className="mt-10">
          <input type="hidden" name="lessonId" value={lesson.id} />
          <input type="hidden" name="completed" value={isDone ? "false" : "true"} />
          <button className={`rounded-md px-4 py-2 font-medium ${isDone ? "border border-current/30" : "bg-blue-800 text-white"}`}>
            {isDone ? "Completed ✓ (click to undo)" : "Mark lesson complete"}
          </button>
        </form>

        <div className="mt-8 flex justify-between border-t border-current/15 pt-4 text-sm">
          {prev ? <Link href={`/learn/${course.slug}/${prev.slug}`} className="hover:underline">← {prev.title}</Link> : <span />}
          {next ? <Link href={`/learn/${course.slug}/${next.slug}`} className="hover:underline">{next.title} →</Link> : <span />}
        </div>
      </main>
    </div>
  );
}
