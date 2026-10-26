"use client";
import { useActionState } from "react";
import type { FormState } from "@/lib/auth/actions";

type Props = {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  mode: "login" | "register";
  next?: string;
};

export function AuthForm({ action, mode, next }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const field = "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700";
  return (
    <form action={formAction} className="mx-auto mt-16 flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "Sign in to LearnOS" : "Create your LearnOS account"}</h1>
      {mode === "register" && (
        <label className="flex flex-col gap-1 text-sm">Name
          <input name="displayName" required maxLength={80} autoComplete="name" className={field} /></label>
      )}
      <label className="flex flex-col gap-1 text-sm">Email
        <input name="email" type="email" required autoComplete="email" className={field} /></label>
      <label className="flex flex-col gap-1 text-sm">Password
        <input name="password" type="password" required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} className={field} /></label>
      {next && <input type="hidden" name="next" value={next} />}
      <p role="alert" aria-live="polite" className="min-h-5 text-sm text-red-700">{state?.error}</p>
      {state?.message && <p role="status" className="text-sm text-green-800">{state.message}</p>}
      <button disabled={pending} className="rounded-md bg-blue-800 px-3 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Working…" : mode === "login" ? "Sign in" : "Create account"}</button>
    </form>
  );
}
