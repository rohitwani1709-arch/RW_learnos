import { describe, it, expect } from "vitest";
import { binarySearch, bubbleSort, insertionSort, linearSearch, mergeSort, queueTrace, selectionSort, stackTrace, InvalidInputError } from "@/lib/visualizer/algorithms";
import { parseNumberList, parseOps, parseTarget } from "@/lib/visualizer/parse";
import { buildTrace } from "@/lib/visualizer";
import type { Trace } from "@/lib/visualizer/types";

const last = (t: Trace) => t.events[t.events.length - 1];
const count = (t: Trace, type: string) => t.events.filter((e) => e.type === type).length;
const asc = (a: number[]) => [...a].sort((x, y) => x - y);

let seed = 12345;
const rnd = (n: number) => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed % n; };

const sorters = { bubbleSort, selectionSort, insertionSort, mergeSort };

describe.each(Object.entries(sorters))("%s", (_name, sort) => {
  const cases: [string, number[]][] = [
    ["empty", []], ["single element", [4]], ["duplicates", [3, 1, 3, 1, 2]],
    ["already sorted", [1, 2, 3, 4]], ["reverse sorted", [5, 4, 3, 2, 1]],
  ];
  it.each(cases)("sorts %s", (_n, input) => {
    const t = sort(input);
    expect(t.initial).toEqual(input);
    expect(last(t).array).toEqual(asc(input));
    expect(last(t).type).toBe("return");
  });
  it("sorts 200 random lists correctly and never highlights an invalid index", () => {
    for (let k = 0; k < 200; k++) {
      const input = Array.from({ length: rnd(12) }, () => rnd(100));
      const t = sort(input);
      expect(last(t).array).toEqual(asc(input));
      for (const e of t.events) {
        expect(e.array).toHaveLength(input.length);
        e.indices.forEach((i) => { expect(i).toBeGreaterThanOrEqual(0); expect(i).toBeLessThan(input.length); });
      }
    }
  });
  it("does not change the input array", () => {
    const input = [3, 1, 2];
    sort(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe("bubble sort events", () => {
  it("makes no swaps and one pass on a sorted list", () => {
    const t = bubbleSort([1, 2, 3]);
    expect(count(t, "swap")).toBe(0);
    expect(count(t, "compare")).toBe(2);
  });
  it("makes one swap per inversion on a reverse-sorted list", () => {
    expect(count(bubbleSort([3, 2, 1]), "swap")).toBe(3);
  });
});

describe("selection sort events", () => {
  it("makes at most n-1 swaps", () => {
    expect(count(selectionSort([5, 4, 3, 2, 1]), "swap")).toBeLessThanOrEqual(4);
    expect(count(selectionSort([1, 2, 3]), "swap")).toBe(0);
  });
});

describe("insertion sort events", () => {
  it("uses write events (shifts) and no swaps", () => {
    const t = insertionSort([2, 1]);
    expect(count(t, "swap")).toBe(0);
    expect(count(t, "write")).toBeGreaterThan(0);
  });
});

describe("linear search", () => {
  it("finds the first occurrence among duplicates", () => {
    const t = linearSearch([4, 7, 7, 1], 7);
    expect(t.events.find((e) => e.type === "found")?.indices).toEqual([1]);
    expect(last(t).vars.result).toBe(1);
  });
  it("reports not_found and returns -1", () => {
    const t = linearSearch([1, 2, 3], 9);
    expect(count(t, "not_found")).toBe(1);
    expect(last(t).vars.result).toBe(-1);
  });
  it("handles an empty list", () => {
    expect(count(linearSearch([], 1), "not_found")).toBe(1);
  });
});

describe("binary search", () => {
  it("updates lo and hi correctly while narrowing the window", () => {
    const t = binarySearch([1, 3, 5, 7, 9, 11], 7);
    const compares = t.events.filter((e) => e.type === "compare").map((e) => [e.vars.lo, e.vars.hi, e.vars.mid]);
    expect(compares).toEqual([[0, 5, 2], [3, 5, 4], [3, 3, 3]]);
    expect(t.events.find((e) => e.type === "found")?.indices).toEqual([3]);
  });
  it("reports not_found when the window empties", () => {
    const t = binarySearch([1, 3, 5], 4);
    expect(count(t, "not_found")).toBe(1);
    expect(last(t).vars.result).toBe(-1);
  });
  it("handles empty and single-element lists", () => {
    expect(count(binarySearch([], 1), "not_found")).toBe(1);
    expect(binarySearch([5], 5).events.some((e) => e.type === "found")).toBe(true);
  });
  it("rejects unsorted input", () => {
    expect(() => binarySearch([3, 1, 2], 1)).toThrow(InvalidInputError);
  });
  it("accepts duplicates when sorted", () => {
    expect(() => binarySearch([1, 2, 2, 3], 2)).not.toThrow();
  });
  it("agrees with a plain membership check for 200 random sorted lists", () => {
    for (let k = 0; k < 200; k++) {
      const list = asc(Array.from({ length: rnd(12) }, () => rnd(30)));
      const target = rnd(30);
      const b = binarySearch(list, target);
      expect(last(b).vars.result !== -1).toBe(list.includes(target));
      if (last(b).vars.result !== -1) expect(list[last(b).vars.result as number]).toBe(target);
    }
  });
});

describe("stack", () => {
  it("is last-in first-out", () => {
    const t = stackTrace(parseOps("push 1, push 2, push 3, pop", "stack"));
    expect(t.events.find((e) => e.type === "pop")?.vars.popped).toBe(3);
    expect(last(t).array).toEqual([1, 2]);
  });
  it("handles underflow without changing state", () => {
    const t = stackTrace(parseOps("pop", "stack"));
    expect(t.events[0].message).toMatch(/underflow/i);
    expect(last(t).array).toEqual([]);
  });
});

describe("queue", () => {
  it("is first-in first-out", () => {
    const t = queueTrace(parseOps("enqueue 1, enqueue 2, enqueue 3, dequeue", "queue"));
    expect(t.events.find((e) => e.type === "dequeue")?.vars.removed).toBe(1);
    expect(last(t).array).toEqual([2, 3]);
  });
  it("handles underflow", () => {
    expect(queueTrace(parseOps("dequeue", "queue")).events[0].message).toMatch(/underflow/i);
  });
});

describe("input parsing and buildTrace", () => {
  it("parses lists separated by commas or spaces", () => {
    expect(parseNumberList("5, 2  9,1")).toEqual([5, 2, 9, 1]);
  });
  it.each(["a, 2", "1.5", "-3", "100"])("rejects invalid list %s", (s) => {
    expect(() => parseNumberList(s)).toThrow(InvalidInputError);
  });
  it("rejects too many items", () => {
    expect(() => parseNumberList(Array(21).fill("1").join(","))).toThrow(InvalidInputError);
  });
  it("rejects a missing target and bad operations", () => {
    expect(() => parseTarget("")).toThrow(InvalidInputError);
    expect(() => parseOps("push", "stack")).toThrow(InvalidInputError);
    expect(() => parseOps("pop 3", "stack")).toThrow(InvalidInputError);
    expect(() => parseOps("enqueue 1", "stack")).toThrow(InvalidInputError);
    expect(() => parseOps("", "queue")).toThrow(InvalidInputError);
  });
  it("returns a friendly error for unsorted binary search", () => {
    const r = buildTrace("binary-search", "3, 1, 2", "1", "");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/sorted/i);
  });
  it("builds a trace for valid input", () => {
    expect(buildTrace("bubble-sort", "3, 1, 2", "", "").ok).toBe(true);
  });
});
