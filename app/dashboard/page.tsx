import { requireUser } from "@/lib/auth/session";
import { signOut } from "@/lib/auth/actions";

export default async function Dashboard() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Welcome, {profile?.display_name ?? "learner"}</h1>
      <p className="mt-2 opacity-75">Your courses and progress will appear here from Milestone 2.</p>
      <form action={signOut} className="mt-6"><button className="rounded-md border px-3 py-2">Sign out</button></form>
    </main>
  );
}
