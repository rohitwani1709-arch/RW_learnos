import { InvalidInputError } from "./types";

export const MAX_ITEMS = 20;
const MAX_OPS = 40;

function toInt(raw: string, what: string): number {
  if (!/^-?\d+$/.test(raw)) throw new InvalidInputError(`"${raw}" is not a whole number (${what}).`);
  const n = Number(raw);
  if (n < 0 || n > 99) throw new InvalidInputError(`${what}: use whole numbers from 0 to 99.`);
  return n;
}

export function parseNumberList(text: string): number[] {
  const parts = text.split(/[,\s]+/).filter(Boolean);
  if (parts.length > MAX_ITEMS) throw new InvalidInputError(`Use at most ${MAX_ITEMS} numbers.`);
  return parts.map((p) => toInt(p, "List"));
}

export function parseTarget(text: string): number {
  const t = text.trim();
  if (!t) throw new InvalidInputError("Enter a number to search for.");
  return toInt(t, "Target");
}

export type Op = { op: "push" | "pop" | "enqueue" | "dequeue"; value?: number };

/** Parses lines like "push 5, pop, push 7". `kind` decides which verbs are valid. */
export function parseOps(text: string, kind: "stack" | "queue"): Op[] {
  const verbs = kind === "stack" ? ["push", "pop"] : ["enqueue", "dequeue"];
  const tokens = text.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) throw new InvalidInputError("Enter at least one operation.");
  if (tokens.length > MAX_OPS) throw new InvalidInputError(`Use at most ${MAX_OPS} operations.`);
  return tokens.map((tok) => {
    const [verb, arg, ...rest] = tok.toLowerCase().split(/\s+/);
    if (!verbs.includes(verb)) throw new InvalidInputError(`Unknown operation "${tok}". Use ${verbs.join(" or ")}.`);
    if (rest.length) throw new InvalidInputError(`Too many values in "${tok}".`);
    const adds = verb === "push" || verb === "enqueue";
    if (adds) {
      if (arg === undefined) throw new InvalidInputError(`"${verb}" needs a value, for example "${verb} 5".`);
      return { op: verb as Op["op"], value: toInt(arg, "Value") };
    }
    if (arg !== undefined) throw new InvalidInputError(`"${verb}" takes no value.`);
    return { op: verb as Op["op"] };
  });
}

// ---- Trees ----
const MAX_TREE_SLOTS = 15; // 4 levels

/** Level-order list where "_" (or "null") marks a missing node, e.g. "8, 3, 10, 1, 6, _, 14". */
export function parseTree(text: string): (number | null)[] {
  const tokens = text.split(/[,\s]+/).filter(Boolean);
  if (tokens.length === 0) throw new InvalidInputError("Enter at least one value, for example 8, 3, 10, 1, 6, _, 14.");
  if (tokens.length > MAX_TREE_SLOTS) throw new InvalidInputError(`Use at most ${MAX_TREE_SLOTS} positions (4 levels).`);
  const vals = tokens.map((t) => (["_", "null", "-"].includes(t.toLowerCase()) ? null : toInt(t, "Tree")));
  if (vals[0] === null) throw new InvalidInputError("The first value is the root and cannot be empty (_).");
  vals.forEach((v, i) => {
    if (v !== null && i > 0 && vals[Math.floor((i - 1) / 2)] === null) {
      throw new InvalidInputError(`Position ${i} has no parent. A node cannot hang below an empty (_) position.`);
    }
  });
  return vals;
}

// ---- Graphs ----
export type Graph = { edges: [number, number][]; nodes: number[]; start: number };

/** Undirected edges like "0-1, 0-2, 1-3" with node numbers 0 to 9. */
export function parseGraph(edgesText: string, startText: string): Graph {
  const parts = edgesText.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) throw new InvalidInputError("Enter at least one edge, for example 0-1.");
  if (parts.length > 20) throw new InvalidInputError("Use at most 20 edges.");
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  const nodes = new Set<number>();
  for (const p of parts) {
    const m = /^(\d+)\s*-\s*(\d+)$/.exec(p);
    if (!m) throw new InvalidInputError(`"${p}" is not an edge. Write edges like 0-1.`);
    const a = Number(m[1]), b = Number(m[2]);
    if (a > 9 || b > 9) throw new InvalidInputError("Node numbers must be from 0 to 9.");
    if (a === b) throw new InvalidInputError("Self-loops are not supported.");
    const lo = Math.min(a, b), hi = Math.max(a, b);
    nodes.add(a); nodes.add(b);
    if (seen.has(`${lo}-${hi}`)) continue; // ignore duplicate edges
    seen.add(`${lo}-${hi}`);
    edges.push([lo, hi]);
  }
  const s = startText.trim();
  if (!/^\d$/.test(s)) throw new InvalidInputError("The start node must be a single number from 0 to 9.");
  nodes.add(Number(s));
  return { edges, nodes: [...nodes].sort((x, y) => x - y), start: Number(s) };
}

// ---- Linked list operations ----
export type ListOp = { op: "insert_head" | "insert_tail" | "insert_at" | "delete"; value: number; index?: number };
const MAX_LIST_OPS = 30;

/** Lines like "insert_head 5, insert_tail 9, insert_at 1 7, delete 9". */
export function parseListOps(text: string): ListOp[] {
  const tokens = text.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
  if (tokens.length === 0) throw new InvalidInputError("Enter at least one operation.");
  if (tokens.length > MAX_LIST_OPS) throw new InvalidInputError(`Use at most ${MAX_LIST_OPS} operations.`);
  return tokens.map((tok) => {
    const [verb, ...args] = tok.toLowerCase().split(/\s+/);
    const need = (n: number, usage: string) => {
      if (args.length !== n) throw new InvalidInputError(`"${tok}" should look like "${usage}".`);
    };
    switch (verb) {
      case "insert_head": need(1, "insert_head 5"); return { op: "insert_head", value: toInt(args[0], "Value") };
      case "insert_tail": need(1, "insert_tail 5"); return { op: "insert_tail", value: toInt(args[0], "Value") };
      case "delete": need(1, "delete 5"); return { op: "delete", value: toInt(args[0], "Value") };
      case "insert_at": need(2, "insert_at 2 5 (index, then value)");
        return { op: "insert_at", index: toInt(args[0], "Index"), value: toInt(args[1], "Value") };
      default: throw new InvalidInputError(`Unknown operation "${tok}". Use insert_head, insert_tail, insert_at or delete.`);
    }
  });
}
