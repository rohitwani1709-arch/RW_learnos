import Link from "next/link";
import { notFound } from "next/navigation";
import { envOk } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { enroll } from "@/lib/courses/actions";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; enrolled?: string }> };

export default async function CoursePage({ params, searchParams }: Props) {
  if (!envOk) notFound();
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, title, description, level, subject, prerequisites, learning_objectives, course_modules(id, title, position, lessons(id, slug, title, position, estimated_minutes))")
    .eq("slug", slug).maybeSingle();
  if (!course) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let enrolled = false;
  if (user) {
    const { data } = await supabase.from("enrollments").select("id").eq("course_id", course.id).maybeSingle();
    enrolled = !!data;
  }
  const modules = [...(course.course_modules ?? [])].sort((a, b) => a.position - b.position);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-sm opacity-70">{course.level} · {course.subject}</p>
      <h1 className="mt-1 text-3xl font-semibold">{course.title}</h1>
      <p className="mt-4">{course.description}</p>

      <div className="mt-6">
        {sp.error && <p role="alert" className="mb-3 text-red-700">Enrollment failed. Try again.</p>}
        {enrolled ? (
          <p role="status" className="font-medium text-green-800">You are enrolled in this course.</p>
        ) : user ? (
          <form action={enroll}>
            <input type="hidden" name="courseId" value={course.id} />
            <button className="rounded-md bg-blue-800 px-4 py-2 font-medium text-white">Enroll in this course</button>
          </form>
        ) : (
          <Link href={`/login?next=/courses/${course.slug}`} className="rounded-md bg-blue-800 px-4 py-2 font-medium text-white">Sign in to enroll</Link>
        )}
      </div>

      {course.learning_objectives.length > 0 && (
        <section className="mt-10"><h2 className="text-xl font-semibold">What you will learn</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">   {course.learning_objectives.map((o: string) => <li key={o}>{o}</li>)}</ul></section>
      )}
      {course.prerequisites.length > 0 && (
        <section className="mt-8"><h2 className="text-xl font-semibold">Prerequisites</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5">{course.prerequisites.map((o: string) => <li key={o}>{o}</li>)}</ul></section>
      )}

      <section className="mt-10"><h2 className="text-xl font-semibold">Course outline</h2>
        <ol className="mt-3 space-y-3">
          {modules.map((m) => {
            const lessons = [...(m.lessons ?? [])].sort((a, b) => a.position - b.position);
            return (
              <li key={m.id} className="rounded-lg border border-current/20 p-4">
                <p className="font-medium">{m.position}. {m.title}</p>
                {lessons.length === 0
                  ? <p className="mt-1 text-sm opacity-70">Lessons for this module have not been added yet.</p>
                  : <ul className="mt-2 space-y-1 text-sm">{lessons.map((l) => <li key={l.id}>{l.title} <span className="opacity-60">({l.estimated_minutes} min)</span></li>)}</ul>}
              </li>
            );
          })}
        </ol>
      </section>
    </main>
  );
}
