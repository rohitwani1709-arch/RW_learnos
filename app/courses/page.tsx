import Link from "next/link";
import { envOk } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Courses | LearnOS" };

export default async function CoursesPage() {
  if (!envOk) return <main className="p-8">Supabase is not configured. See <code>.env.example</code>.</main>;
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("courses").select("id, slug, title, description, level, subject").eq("status", "published").order("title");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Courses</h1>
      {error && <p role="alert" className="mt-6 text-red-700">Courses could not be loaded. Try again in a moment.</p>}
      {!error && courses?.length === 0 && (
        <p className="mt-6 opacity-75">No published courses yet. Run <code>supabase/seed_dsa_shell.sql</code> to add the sample course.</p>
      )}
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {courses?.map((c) => (
          <li key={c.id} className="rounded-lg border border-current/20 p-5">
            <Link href={`/courses/${c.slug}`} className="text-lg font-medium hover:underline">{c.title}</Link>
            <p className="mt-1 text-sm opacity-70">{c.level} · {c.subject}</p>
            <p className="mt-3 text-sm">{c.description}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
