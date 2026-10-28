"use client";
import { useEffect, useState } from "react";
import { ALGORITHMS, buildTrace, type AlgoId, type BuildResult } from "@/lib/visualizer";
import type { EventType } from "@/lib/visualizer/types";

const COLORS: Partial<Record<EventType, string>> = {
  compare: "bg-amber-500", swap: "bg-red-600", write: "bg-purple-600", found: "bg-green-600",
  push: "bg-blue-600", enqueue: "bg-blue-600",
};
const SPEEDS = [{ label: "Slow", ms: 1400 }, { label: "Normal", ms: 800 }, { label: "Fast", ms: 300 }];
const DEFAULT_OPS = { stack: "push 3, push 8, pop, push 5, pop, pop, pop", queue: "enqueue 3, enqueue 8, dequeue, enqueue 5, dequeue, dequeue, dequeue" };

export function Visualizer() {
  const [algo, setAlgo] = useState<AlgoId>("binary-search");
  const [list, setList] = useState("2, 5, 8, 12, 16, 23, 38");
  const [target, setTarget] = useState("23");
  const [ops, setOps] = useState(DEFAULT_OPS);
  const [result, setResult] = useState<BuildResult>(() => buildTrace("binary-search", "2, 5, 8, 12, 16, 23, 38", "23", ""));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);

  const meta = ALGORITHMS[algo];
  const kind = meta.input;
  const opsKind = kind === "stack" || kind === "queue" ? kind : null;
  const events = result.ok ? result.trace.events : [];
  const total = events.length;
  const isPlaying = playing && step < total; // derived: playback stops by itself at the last step
  const frame = step === 0 ? null : events[step - 1];
  const items = result.ok ? (frame ? frame.array : result.trace.initial) : [];
  const max = Math.max(1, ...items);

  function build(id: AlgoId = algo, l = list, t = target, o = ops) {
    const k = ALGORITHMS[id].input;
    setResult(buildTrace(id, l, t, k === "stack" || k === "queue" ? o[k] : ""));
    setStep(0); setPlaying(false);
  }

  useEffect(() => {
    if (!isPlaying) return;
    const id = setTimeout(() => setStep((s) => s + 1), speed);
    return () => clearTimeout(id);
  }, [isPlaying, step, speed]);

  const btn = "rounded-md border border-current/30 px-3 py-1.5 text-sm disabled:opacity-40";
  const field = "mt-1 w-full rounded-md border border-current/30 bg-transparent p-2 font-mono text-sm";
  const highlighted = (i: number) => !!frame && frame.indices.includes(i);
  const dimmed = (i: number) => !!frame?.range && (i < frame.range[0] || i > frame.range[1]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">Algorithm
          <select value={algo} className={field}
            onChange={(e) => { const id = e.target.value as AlgoId; setAlgo(id); build(id); }}>
            {Object.entries(ALGORITHMS).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}
          </select>
        </label>
        {opsKind ? (
          <label className="block text-sm font-medium">Operations (comma separated)
            <input value={ops[opsKind]} className={field} onChange={(e) => setOps({ ...ops, [opsKind]: e.target.value })} />
          </label>
        ) : (
          <label className="block text-sm font-medium">Numbers (0–99, up to 20)
            <input value={list} className={field} onChange={(e) => setList(e.target.value)} />
          </label>
        )}
        {kind === "search" && (
          <label className="block text-sm font-medium">Target
            <input value={target} className={field} onChange={(e) => setTarget(e.target.value)} />
          </label>
        )}
        <div className="flex items-end"><button className={`${btn} bg-blue-800 text-white`} onClick={() => build()}>Visualize</button></div>
      </div>

      {!result.ok && <p role="alert" className="rounded-md border border-red-700/50 p-3 text-sm text-red-700">{result.error}</p>}

      {result.ok && (
        <>
          <div role="img" aria-label={`Current state: ${items.join(", ") || "empty"}`}
            className="flex min-h-56 items-end gap-2 overflow-x-auto rounded-md border border-current/20 p-4">
            {items.length === 0 && <p className="text-sm opacity-60">The {kind === "list" || kind === "search" ? "list" : kind} is empty.</p>}
            {items.map((v, i) => {
              const barLike = kind === "list" || kind === "search";
              const color = highlighted(i) && frame ? (COLORS[frame.type] ?? "bg-slate-500") : "bg-blue-800/60";
              return (
                <div key={i} className={`flex flex-col items-center text-xs ${dimmed(i) ? "opacity-30" : ""}`}>
                  <span className="mb-1 font-mono">{v}</span>
                  <div className={`w-8 rounded-t ${color} ${highlighted(i) ? "ring-2 ring-current" : ""}`}
                    style={{ height: barLike ? `${Math.round((v / max) * 140) + 8}px` : "32px" }} />
                  <span className="mt-1 opacity-70">{i}{kind === "stack" && i === items.length - 1 ? " top" : ""}{kind === "queue" && i === 0 ? " front" : ""}</span>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} onClick={() => { setStep(0); setPlaying(false); }} disabled={step === 0}>Reset</button>
            <button className={btn} onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}>Previous</button>
            <button className={`${btn} bg-blue-800 text-white`} disabled={total === 0}
              onClick={() => { if (step >= total) { setStep(0); setPlaying(true); } else { setPlaying(!isPlaying); } }}>{isPlaying ? "Pause" : step >= total && total > 0 ? "Replay" : "Play"}</button>
            <button className={btn} onClick={() => { setPlaying(false); setStep((s) => Math.min(total, s + 1)); }} disabled={step >= total}>Next</button>
            <label className="ml-2 text-sm">Speed{" "}
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-md border border-current/30 bg-transparent p-1">
                {SPEEDS.map((s) => <option key={s.ms} value={s.ms}>{s.label}</option>)}
              </select>
            </label>
            <span className="ml-auto text-sm">Step {step} of {total}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-md border border-current/20 p-4">
              <h2 className="text-sm font-semibold">What is happening</h2>
              <p aria-live="polite" className="mt-2 text-sm">
                {frame ? <><strong>{frame.type.replace("_", " ")}</strong>{frame.indices.length > 0 && ` (index ${frame.indices.join(", ")})`}: {frame.message}</>
                  : "Initial state. Press Play or Next to begin."}
              </p>
              {frame && Object.keys(frame.vars).length > 0 && (
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-sm">
                  {Object.entries(frame.vars).map(([k, v]) => <><dt key={`k${k}`} className="opacity-70">{k}</dt><dd key={`v${k}`}>{v}</dd></>)}
                </dl>)}
            </div>
            <div className="rounded-md border border-current/20 p-4 text-sm">
              <h2 className="font-semibold">Complexity</h2>
              <table className="mt-2 w-full"><tbody>
                <tr><th className="text-left font-normal opacity-70">Best</th><td>{meta.complexity.best}</td></tr>
                <tr><th className="text-left font-normal opacity-70">Average</th><td>{meta.complexity.average}</td></tr>
                <tr><th className="text-left font-normal opacity-70">Worst</th><td>{meta.complexity.worst}</td></tr>
                <tr><th className="text-left font-normal opacity-70">Space</th><td>{meta.complexity.space}</td></tr>
              </tbody></table>
              <p className="mt-2 opacity-80">{meta.complexity.note}</p>
            </div>
          </div>
          <p className="text-xs opacity-70">Colours: amber = compare, red = swap, purple = write, green = found, blue = push/enqueue. Highlighted items also have an outline, and the text above always names the action.</p>
        </>
      )}
    </div>
  );
}
