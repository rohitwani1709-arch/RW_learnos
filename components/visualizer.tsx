"use client";
import { Fragment, useEffect, useState } from "react";
import { ALGORITHMS, buildTrace, type AlgoId, type BuildResult } from "@/lib/visualizer";
import type { EventType } from "@/lib/visualizer/types";

type OpsKind = "stack" | "queue" | "linkedlist";
type Inputs = { list: string; target: string; ops: Record<OpsKind, string>; tree: string; edges: string; start: string };

const DEFAULTS: Inputs = {
  list: "2, 5, 8, 12, 16, 23, 38",
  target: "23",
  ops: {
    stack: "push 3, push 8, pop, push 5, pop, pop, pop",
    queue: "enqueue 3, enqueue 8, dequeue, enqueue 5, dequeue, dequeue, dequeue",
    linkedlist: "insert_head 5, insert_tail 9, insert_at 1 7, delete 7, delete 99",
  },
  tree: "8, 3, 10, 1, 6, _, 14",
  edges: "0-1, 0-2, 1-3, 2-3, 3-4",
  start: "0",
};

const BAR: Partial<Record<EventType, string>> = {
  compare: "bg-amber-500", swap: "bg-red-600", write: "bg-purple-600", found: "bg-green-600",
  push: "bg-blue-600", enqueue: "bg-blue-600", pop: "bg-orange-600", dequeue: "bg-orange-600", visit_node: "bg-teal-600",
};
const NODE: Partial<Record<EventType, string>> = {
  compare: "fill-amber-500", write: "fill-purple-600", found: "fill-green-600", visit_node: "fill-teal-600",
  push: "fill-blue-600", enqueue: "fill-blue-600", pop: "fill-orange-600", dequeue: "fill-orange-600",
};
const SPEEDS = [{ label: "Slow", ms: 1400 }, { label: "Normal", ms: 800 }, { label: "Fast", ms: 300 }];

function run(id: AlgoId, i: Inputs): BuildResult {
  const kind = ALGORITHMS[id].input;
  const ops = kind === "stack" || kind === "queue" || kind === "linkedlist" ? i.ops[kind] : "";
  return buildTrace(id, i.list, kind === "graph" ? i.start : i.target, ops, { tree: i.tree, edges: i.edges });
}

export function Visualizer() {
  const [algo, setAlgo] = useState<AlgoId>("binary-search");
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [result, setResult] = useState<BuildResult>(() => run("binary-search", DEFAULTS));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(800);

  const meta = ALGORITHMS[algo];
  const kind = meta.input;
  const total = result.ok ? result.trace.events.length : 0;
  const isPlaying = playing && step < total; // derived: playback stops by itself at the last step

  const aFrame = result.ok && result.kind === "array" && step > 0 ? result.trace.events[step - 1] : null;
  const sFrame = result.ok && result.kind === "struct" && step > 0 ? result.trace.events[step - 1] : null;
  const frame = aFrame ?? sFrame;
  const items = result.ok && result.kind === "array" ? (aFrame ? aFrame.array : result.trace.initial) : [];
  const max = Math.max(1, ...items);
  const graphic = result.ok && result.kind === "struct"
    ? (sFrame ? { nodes: sFrame.nodes, edges: sFrame.edges } : result.trace.initial) : null;

  function build(id: AlgoId = algo, i: Inputs = inputs) {
    setResult(run(id, i));
    setStep(0);
    setPlaying(false);
  }
  const set = <K extends keyof Inputs>(key: K, value: Inputs[K]) => setInputs({ ...inputs, [key]: value });

  useEffect(() => {
    if (!isPlaying) return;
    const id = setTimeout(() => setStep((s) => s + 1), speed);
    return () => clearTimeout(id);
  }, [isPlaying, step, speed]);

  const btn = "rounded-md border border-current/30 px-3 py-1.5 text-sm disabled:opacity-40";
  const field = "mt-1 w-full rounded-md border border-current/30 bg-transparent p-2 font-mono text-sm";
  const highlighted = (i: number) => !!aFrame && aFrame.indices.includes(i);
  const dimmed = (i: number) => !!aFrame?.range && (i < aFrame.range[0] || i > aFrame.range[1]);
  const barLike = kind === "list" || kind === "search";

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">Algorithm
          <select value={algo} className={field} onChange={(e) => { const id = e.target.value as AlgoId; setAlgo(id); build(id); }}>
            {Object.entries(ALGORITHMS).map(([id, a]) => <option key={id} value={id}>{a.label}</option>)}
          </select>
        </label>
        {(kind === "list" || kind === "search" || kind === "linkedlist") && (
          <label className="block text-sm font-medium">{kind === "linkedlist" ? "Starting list (0–99, up to 20)" : "Numbers (0–99, up to 20)"}
            <input value={inputs.list} className={field} onChange={(e) => set("list", e.target.value)} />
          </label>
        )}
        {kind === "search" && (
          <label className="block text-sm font-medium">Target
            <input value={inputs.target} className={field} onChange={(e) => set("target", e.target.value)} />
          </label>
        )}
        {(kind === "stack" || kind === "queue" || kind === "linkedlist") && (
          <label className="block text-sm font-medium">Operations (comma separated)
            <input value={inputs.ops[kind]} className={field} onChange={(e) => set("ops", { ...inputs.ops, [kind]: e.target.value })} />
          </label>
        )}
        {kind === "tree" && (
          <label className="block text-sm font-medium">Tree, level by level (use _ for a missing node, up to 15 positions)
            <input value={inputs.tree} className={field} onChange={(e) => set("tree", e.target.value)} />
          </label>
        )}
        {kind === "graph" && (
          <>
            <label className="block text-sm font-medium">Edges (nodes 0–9, undirected)
              <input value={inputs.edges} className={field} onChange={(e) => set("edges", e.target.value)} />
            </label>
            <label className="block text-sm font-medium">Start node
              <input value={inputs.start} className={field} onChange={(e) => set("start", e.target.value)} />
            </label>
          </>
        )}
        <div className="flex items-end"><button className={`${btn} bg-blue-800 text-white`} onClick={() => build()}>Visualize</button></div>
      </div>

      {!result.ok && <p role="alert" className="rounded-md border border-red-700/50 p-3 text-sm text-red-700">{result.error}</p>}

      {result.ok && (
        <>
          {result.kind === "array" && (
            <div role="img" aria-label={`Current state: ${items.join(", ") || "empty"}`}
              className="flex min-h-56 items-end gap-2 overflow-x-auto rounded-md border border-current/20 p-4">
              {items.length === 0 && <p className="text-sm opacity-60">The {kind === "stack" || kind === "queue" ? kind : "list"} is empty.</p>}
              {items.map((v, i) => {
                const color = highlighted(i) && aFrame ? (BAR[aFrame.type] ?? "bg-slate-500") : "bg-blue-800/60";
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
          )}

          {graphic && (() => {
            const w = Math.max(600, ...graphic.nodes.map((n) => n.x + 50));
            const h = Math.max(120, ...graphic.nodes.map((n) => n.y + 50));
            const at = (id: number) => graphic.nodes.find((n) => n.id === id);
            return (
              <div className="overflow-x-auto rounded-md border border-current/20 p-2">
                <svg viewBox={`0 0 ${w} ${h}`} style={{ minWidth: Math.min(w, 1500) }} role="img"
                  aria-label={`Structure with ${graphic.nodes.length} node(s): ${graphic.nodes.map((n) => n.label).join(", ") || "none"}`}>
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                    </marker>
                  </defs>
                  {graphic.edges.map((e) => {
                    const a = at(e.from), b = at(e.to);
                    if (!a || !b) return null;
                    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, r = 20;
                    return <line key={`${e.from}-${e.to}`} x1={a.x + (dx / len) * r} y1={a.y + (dy / len) * r}
                      x2={b.x - (dx / len) * (r + (e.directed ? 4 : 0))} y2={b.y - (dy / len) * (r + (e.directed ? 4 : 0))}
                      stroke="currentColor" strokeWidth={1.5} markerEnd={e.directed ? "url(#arrow)" : undefined} />;
                  })}
                  {graphic.nodes.map((n) => {
                    const isCurrent = sFrame?.current === n.id;
                    const fill = isCurrent && sFrame ? (NODE[sFrame.type] ?? "fill-slate-500")
                      : sFrame?.visited.includes(n.id) ? "fill-green-600/50"
                      : sFrame?.frontier.includes(n.id) ? "fill-blue-600/40" : "fill-transparent";
                    return (
                      <g key={n.id}>
                        <circle cx={n.x} cy={n.y} r={20} className={`${fill} stroke-current`} strokeWidth={isCurrent ? 4 : 1.5} />
                        <text x={n.x} y={n.y} dy={5} textAnchor="middle" className="fill-current text-sm font-medium">{n.label}</text>
                      </g>
                    );
                  })}
                  {graphic.nodes.length === 0 && <text x={20} y={40} className="fill-current text-sm">The list is empty.</text>}
                </svg>
              </div>
            );
          })()}

          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} onClick={() => { setStep(0); setPlaying(false); }} disabled={step === 0}>Reset</button>
            <button className={btn} onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}>Previous</button>
            <button className={`${btn} bg-blue-800 text-white`} disabled={total === 0}
              onClick={() => { if (step >= total) { setStep(0); setPlaying(true); } else { setPlaying(!isPlaying); } }}>
              {isPlaying ? "Pause" : step >= total && total > 0 ? "Replay" : "Play"}
            </button>
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
                {frame ? <><strong>{frame.type.replace("_", " ")}</strong>{aFrame && aFrame.indices.length > 0 && ` (index ${aFrame.indices.join(", ")})`}: {frame.message}</>
                  : "Initial state. Press Play or Next to begin."}
              </p>
              {frame && Object.keys(frame.vars).length > 0 && (
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 font-mono text-sm">
                  {Object.entries(frame.vars).map(([k, v]) => <Fragment key={k}><dt className="opacity-70">{k}</dt><dd>{v}</dd></Fragment>)}
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
          <p className="text-xs opacity-70">
            Colours: amber = compare, red = swap, purple = write, green = found, teal = visit, blue = push/enqueue, orange = pop/dequeue.
            In diagrams, a thick outline marks the current node, a green fill means already visited, and a blue fill means waiting in the queue or on the call stack.
            The text above always names the action.
          </p>
        </>
      )}
    </div>
  );
}
