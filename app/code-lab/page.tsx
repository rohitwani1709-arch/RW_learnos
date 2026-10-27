import { requireUser } from "@/lib/auth/session";
import { judge0Configured } from "@/lib/execution/judge0";
import { CodeEditor, type HistoryItem } from "@/components/code-editor";

export const metadata = { title: "Code Lab | LearnOS" };

export default async function CodeLab() {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("code_submissions")
    .select("id, created_at, status, source_code").order("created_at", { ascending: false }).limit(10);
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-3xl font-semibold">Code Lab</h1>
      <p className="mt-1 mb-6 text-sm opacity-70">Python 3. Your code runs in a separate sandbox, never on this server.</p>
      <CodeEditor configured={judge0Configured()} history={(data ?? []) as HistoryItem[]} />
    </main>
  );
}
