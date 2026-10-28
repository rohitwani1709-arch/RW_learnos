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
