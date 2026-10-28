import { InvalidInputError, type EventType, type Trace, type TraceEvent } from "./types";
import type { Op } from "./parse";

export { InvalidInputError };

class Recorder {
  a: number[];
  private initial: number[];
  private events: TraceEvent[] = [];
  constructor(input: number[]) { this.a = [...input]; this.initial = [...input]; }
  emit(type: EventType, indices: number[], message: string, vars: TraceEvent["vars"] = {}, range?: [number, number]) {
    this.events.push({ type, indices, array: [...this.a], vars, message, range });
  }
  swap(i: number, j: number, vars: TraceEvent["vars"] = {}) {
    [this.a[i], this.a[j]] = [this.a[j], this.a[i]];
    this.emit("swap", [i, j], `Swap positions ${i} and ${j}.`, vars);
  }
  trace(): Trace { return { initial: this.initial, events: this.events }; }
}

export function linearSearch(input: number[], target: number): Trace {
  const r = new Recorder(input);
  for (let i = 0; i < r.a.length; i++) {
    r.emit("compare", [i], `Compare ${r.a[i]} with the target ${target}.`, { i, target });
    if (r.a[i] === target) {
      r.emit("found", [i], `Found ${target} at index ${i}.`, { i, target });
      r.emit("return", [i], `Return ${i}.`, { result: i });
      return r.trace();
    }
  }
  r.emit("not_found", [], `${target} is not in the list.`, { target });
  r.emit("return", [], "Return -1.", { result: -1 });
  return r.trace();
}

export function binarySearch(input: number[], target: number): Trace {
  for (let i = 1; i < input.length; i++) {
    if (input[i - 1] > input[i]) throw new InvalidInputError("Binary search needs a list sorted from smallest to largest. Sort it first or use linear search.");
  }
  const r = new Recorder(input);
  let lo = 0, hi = input.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const v = r.a[mid];
    const vars = { lo, hi, mid, target };
    if (v === target) {
      r.emit("compare", [mid], `Middle value ${v} equals the target.`, vars, [lo, hi]);
      r.emit("found", [mid], `Found ${target} at index ${mid}.`, vars, [lo, hi]);
      r.emit("return", [mid], `Return ${mid}.`, { result: mid });
      return r.trace();
    }
    if (v < target) {
      r.emit("compare", [mid], `${v} is less than ${target}, so the target must be to the right. Set lo to ${mid + 1}.`, vars, [lo, hi]);
      lo = mid + 1;
    } else {
      r.emit("compare", [mid], `${v} is greater than ${target}, so the target must be to the left. Set hi to ${mid - 1}.`, vars, [lo, hi]);
      hi = mid - 1;
    }
  }
  r.emit("not_found", [], `The search window is empty (lo ${lo} > hi ${hi}), so ${target} is not in the list.`, { lo, hi, target });
  r.emit("return", [], "Return -1.", { result: -1 });
  return r.trace();
}

export function bubbleSort(input: number[]): Trace {
  const r = new Recorder(input);
  const n = r.a.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      r.emit("compare", [j, j + 1], `Compare ${r.a[j]} and ${r.a[j + 1]}.`, { pass: i + 1, j });
      if (r.a[j] > r.a[j + 1]) { r.swap(j, j + 1, { pass: i + 1, j }); swapped = true; }
    }
    if (!swapped) break; // already sorted: stop early
  }
  r.emit("return", [], "The list is sorted.", { sorted: "yes" });
  return r.trace();
}

export function selectionSort(input: number[]): Trace {
  const r = new Recorder(input);
  const n = r.a.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      r.emit("compare", [min, j], `Compare the smallest so far (${r.a[min]}) with ${r.a[j]}.`, { i, min, j });
      if (r.a[j] < r.a[min]) min = j;
    }
    if (min !== i) r.swap(i, min, { i, min });
  }
  r.emit("return", [], "The list is sorted.", { sorted: "yes" });
  return r.trace();
}

export function insertionSort(input: number[]): Trace {
  const r = new Recorder(input);
  for (let i = 1; i < r.a.length; i++) {
    const key = r.a[i];
    let j = i - 1;
    while (j >= 0) {
      r.emit("compare", [j], `Compare ${r.a[j]} with the value being inserted (${key}).`, { i, j, key });
      if (r.a[j] <= key) break;
      r.a[j + 1] = r.a[j];
      r.emit("write", [j + 1], `${r.a[j]} is larger, so shift it one place right.`, { i, j, key });
      j--;
    }
    r.a[j + 1] = key;
    r.emit("write", [j + 1], `Place ${key} at index ${j + 1}.`, { i, key });
  }
  r.emit("return", [], "The list is sorted.", { sorted: "yes" });
  return r.trace();
}

export function mergeSort(input: number[]): Trace {
  const r = new Recorder(input);
  const sort = (lo: number, hi: number) => {
    if (hi - lo < 1) return;
    const mid = Math.floor((lo + hi) / 2);
    sort(lo, mid);
    sort(mid + 1, hi);
    const left = r.a.slice(lo, mid + 1), right = r.a.slice(mid + 1, hi + 1);
    let i = 0, j = 0, k = lo;
    const put = (v: number, why: string) => { r.a[k] = v; r.emit("write", [k], why, { lo, mid, hi }, [lo, hi]); k++; };
    while (i < left.length && j < right.length) {
      r.emit("compare", [lo + i, mid + 1 + j], `Merging: compare ${left[i]} (left) with ${right[j]} (right).`, { lo, mid, hi }, [lo, hi]);
      if (left[i] <= right[j]) { put(left[i], `Write ${left[i]} from the left half.`); i++; }
      else { put(right[j], `Write ${right[j]} from the right half.`); j++; }
    }
    while (i < left.length) { put(left[i], `Copy the remaining ${left[i]} from the left half.`); i++; }
    while (j < right.length) { put(right[j], `Copy the remaining ${right[j]} from the right half.`); j++; }
  };
  sort(0, r.a.length - 1);
  r.emit("return", [], "The list is sorted.", { sorted: "yes" });
  return r.trace();
}

export function stackTrace(ops: Op[]): Trace {
  const r = new Recorder([]);
  for (const o of ops) {
    if (o.op === "push") {
      r.a.push(o.value as number);
      r.emit("push", [r.a.length - 1], `Push ${o.value} onto the top.`, { size: r.a.length });
    } else if (r.a.length === 0) {
      r.emit("return", [], "Stack underflow: nothing to pop, so the stack is unchanged.", { size: 0 });
    } else {
      const v = r.a.pop() as number;
      r.emit("pop", [], `Pop ${v} from the top.`, { popped: v, size: r.a.length });
    }
  }
  r.emit("return", [], `Done. The stack holds ${r.a.length} item(s).`, { size: r.a.length });
  return r.trace();
}

export function queueTrace(ops: Op[]): Trace {
  const r = new Recorder([]);
  for (const o of ops) {
    if (o.op === "enqueue") {
      r.a.push(o.value as number);
      r.emit("enqueue", [r.a.length - 1], `Add ${o.value} at the back.`, { size: r.a.length });
    } else if (r.a.length === 0) {
      r.emit("return", [], "Queue underflow: nothing to remove, so the queue is unchanged.", { size: 0 });
    } else {
      const v = r.a.shift() as number;
      r.emit("dequeue", [], `Remove ${v} from the front.`, { removed: v, size: r.a.length });
    }
  }
  r.emit("return", [], `Done. The queue holds ${r.a.length} item(s).`, { size: r.a.length });
  return r.trace();
}
