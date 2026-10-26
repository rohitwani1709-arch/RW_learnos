import Link from "next/link";
import { envOk } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

export async function SiteNav() {
  let signedIn = false;
  if (envOk) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    signedIn = !!data.user;
  }
  const link = "rounded px-2 py-1 hover:underline focus-visible:outline focus-visible:outline-2";
  return (
    <header className="border-b border-current/15">
      <nav aria-label="Main" className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-3 text-sm">
        <Link href="/" className="mr-2 text-base font-semibold">LearnOS</Link>
        <Link href="/courses" className={link}>Courses</Link>
        <span className="flex-1" />
        {signedIn ? (
          <>
            <Link href="/dashboard" className={link}>Dashboard</Link>
            <form action={signOut}><button className={link}>Sign out</button></form>
          </>
        ) : (
          <>
            <Link href="/login" className={link}>Sign in</Link>
            <Link href="/register" className="rounded bg-blue-800 px-3 py-1.5 text-white">Create account</Link>
          </>
        )}
      </nav>
    </header>
  );
}
