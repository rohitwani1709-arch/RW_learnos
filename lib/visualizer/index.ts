import { binarySearch, bubbleSort, insertionSort, linearSearch, mergeSort, queueTrace, selectionSort, stackTrace } from "./algorithms";
import { parseNumberList, parseOps, parseTarget } from "./parse";
import { InvalidInputError, type Trace } from "./types";

export type AlgoId = "linear-search" | "binary-search" | "bubble-sort" | "selection-sort" | "insertion-sort" | "merge-sort" | "stack" | "queue";
type Complexity = { best: string; average: string; worst: string; space: string; note: string };
export const ALGORITHMS: Record<AlgoId, { label: string; input: "list" | "search" | "stack" | "queue"; complexity: Complexity }> = {
  "linear-search": { label: "Linear search", input: "search", complexity: { best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(1)", note: "Works on any list." } },
  "binary-search": { label: "Binary search", input: "search", complexity: { best: "O(1)", average: "O(log n)", worst: "O(log n)", space: "O(1)", note: "Only valid on a list sorted in ascending order." } },
  "bubble-sort": { label: "Bubble sort", input: "list", complexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", note: "Best case O(n) because this version stops after a pass with no swaps." } },
  "selection-sort": { label: "Selection sort", input: "list", complexity: { best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", note: "Always makes the same comparisons; at most n−1 swaps." } },
  "insertion-sort": { label: "Insertion sort", input: "list", complexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", note: "Fast on nearly sorted lists." } },
  "merge-sort": { label: "Merge sort", input: "list", complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", note: "Uses extra memory to merge halves." } },
  stack: { label: "Stack (LIFO)", input: "stack", complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(n)", note: "Push and pop each take constant time." } },
  queue: { label: "Queue (FIFO)", input: "queue", complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(n)", note: "Enqueue and dequeue each take constant time in a linked or circular implementation." } },
};

export type BuildResult = { ok: true; trace: Trace } | { ok: false; error: string };

export function buildTrace(id: AlgoId, listText: string, targetText: string, opsText: string): BuildResult {
  try {
    const kind = ALGORITHMS[id].input;
    if (kind === "stack" || kind === "queue") {
      const ops = parseOps(opsText, kind);
      return { ok: true, trace: kind === "stack" ? stackTrace(ops) : queueTrace(ops) };
    }
    const list = parseNumberList(listText);
    switch (id) {
      case "linear-search": return { ok: true, trace: linearSearch(list, parseTarget(targetText)) };
      case "binary-search": return { ok: true, trace: binarySearch(list, parseTarget(targetText)) };
      case "bubble-sort": return { ok: true, trace: bubbleSort(list) };
      case "selection-sort": return { ok: true, trace: selectionSort(list) };
      case "insertion-sort": return { ok: true, trace: insertionSort(list) };
      default: return { ok: true, trace: mergeSort(list) };
    }
  } catch (e) {
    if (e instanceof InvalidInputError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not build the visualization." };
  }
}
