"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { runCode } from "@/lib/execution/actions";
import type { RunResult } from "@/lib/execution/types";

const STARTER = `def solve(numbers):
    return max(numbers)

print(solve([3, 9, 2, 7]))
`;

export type HistoryItem = { id: string; created_at: string; status: string; source_code: string };

export function CodeEditor({ configured, history }: { configured: boolean; history: HistoryItem[] }) {
  const router = useRouter();
  const [code, setCode] = useState(STARTER);
  const [stdin, setStdin] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);
  const [pending, start] = useTransition();
  const [theme, setTheme] = useState("vs-dark");
  useEffect(() => { setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "vs-dark" : "light"); }, []);

  function run() {
    setResult(null);
    start(async () => {
      try { setResult(await runCode({ code, stdin })); router.refresh(); }
      catch { setResult({ ok: false, reason: "unavailable", message: "Something went wrong. Please try again." }); }
    });
  }
  const btn = "rounded-md px-4 py-2 text-sm font-medium";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-label="Code editor">
        <div className="mb-2 flex gap-2">
          <button onClick={run} disabled={!configured || pending} className={`${btn} bg-blue-800 text-white disabled:opacity-50`}>
            {pending ? "Running…" : "Run"}
          </button>
          <button onClick={() => setCode(STARTER)} disabled={pending} className={`${btn} border border-current/30`}>Reset</button>
        </div>
        <div className="overflow-hidden rounded-md border border-current/20">
          <Editor height="420px" language="python" theme={theme} value={code}
            onChange={(v) => setCode(v ?? "")} options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }} />
        </div>
      </section>

      <section aria-label="Input and output" className="space-y-4">
        {!configured && (
          <p role="status" className="rounded-md border border-amber-600/50 p-3 text-sm">
            Code execution is not set up. Set <code>JUDGE0_BASE_URL</code> in <code>.env.local</code> and restart the server. The editor works, but Run is disabled.
          </p>
        )}
        <label className="block text-sm font-medium">Input (stdin)
          <textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3} maxLength={5000}
            className="mt-1 w-full rounded-md border border-current/30 bg-transparent p-2 font-mono text-sm" />
        </label>
        <div aria-live="polite" className="min-h-32 rounded-md border border-current/20 p-3 text-sm">
          {pending && <p>Running…</p>}
          {!pending && !result && <p className="opacity-60">Output will appear here.</p>}
          {result && !result.ok && <p role="alert" className="text-red-700">{result.message}</p>}
          {result?.ok && (
            <>
              <p className="font-medium">{result.status}
                <span className="ml-2 font-normal opacity-70">
                  {result.timeSec !== null && `${result.timeSec}s`}{result.memoryKb !== null && ` · ${Math.round(result.memoryKb / 1024)} MB`}
                </span></p>
              {result.stdout && <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">{result.stdout}</pre>}
              {(result.stderr || result.compileOutput) && (
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-red-700">{result.stderr || result.compileOutput}</pre>)}
            </>
          )}
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">Recent runs ({history.length})</summary>
          {history.length === 0 ? <p className="mt-2 opacity-60">No runs yet.</p> : (
            <ul className="mt-2 space-y-1">
              {history.map((h) => (
                <li key={h.id}>
                  <button onClick={() => setCode(h.source_code)} className="underline">
                    {new Date(h.created_at).toISOString().replace("T", " ").slice(0, 16)} UTC
                  </button> <span className="opacity-70">{h.status}</span>
                </li>))}
            </ul>)}
        </details>
      </section>
    </div>
  );
}
