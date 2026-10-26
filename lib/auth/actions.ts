"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireEnv } from "@/lib/env";
import { safeNext } from "@/lib/auth/session";

export type FormState = { error?: string; message?: string } | undefined;

const creds = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters.").max(72),
});

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = creds.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email or password is incorrect, or the email is not verified yet." };
  redirect(safeNext(String(form.get("next") ?? "")));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = creds.extend({ displayName: z.string().trim().min(1, "Enter your name.").max(80) })
    .safeParse({ email: form.get("email"), password: form.get("password"), displayName: form.get("displayName") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${requireEnv().NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) return { error: "Could not create the account. Try a different email or a stronger password." };
  return { message: "Check your inbox and click the verification link to finish signing up." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
