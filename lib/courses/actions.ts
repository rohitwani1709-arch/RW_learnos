"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";

export async function enroll(form: FormData) {
  const courseId = z.string().uuid().safeParse(form.get("courseId"));
  if (!courseId.success) redirect("/courses");

  const { supabase, user } = await requireUser();

  // RLS only returns published courses, so this also blocks enrolling in drafts.
  const { data: course } = await supabase.from("courses").select("slug").eq("id", courseId.data).maybeSingle();
  if (!course) redirect("/courses");

  // Idempotent: the unique (user_id, course_id) constraint makes a repeat a no-op.
  const { error } = await supabase
    .from("enrollments")
    .upsert({ user_id: user.id, course_id: courseId.data }, { onConflict: "user_id,course_id", ignoreDuplicates: true });
  if (error) redirect(`/courses/${course.slug}?error=enroll`);

  revalidatePath(`/courses/${course.slug}`);
  redirect(`/courses/${course.slug}?enrolled=1`);
}
