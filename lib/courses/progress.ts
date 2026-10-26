"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";

const schema = z.object({ lessonId: z.string().uuid(), completed: z.enum(["true", "false"]) });

// Idempotent. RLS only allows progress rows for lessons in courses the user is enrolled in.
export async function setLessonComplete(form: FormData) {
  const parsed = schema.safeParse({ lessonId: form.get("lessonId"), completed: form.get("completed") });
  if (!parsed.success) redirect("/my-learning");
  const { lessonId, completed } = parsed.data;
  const { supabase, user } = await requireUser();

  const { data } = await supabase.from("lessons").select("slug, courses(slug)").eq("id", lessonId).maybeSingle();
  const lesson = data as unknown as { slug: string; courses: { slug: string } } | null;
  if (!lesson) redirect("/my-learning");
  const path = `/learn/${lesson.courses.slug}/${lesson.slug}`;

  const { error } =
    completed === "true"
      ? await supabase.from("lesson_progress")
          .upsert({ user_id: user.id, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true })
      : await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);

  if (error) redirect(`${path}?error=progress`);
  revalidatePath(path);
  redirect(path);
}
