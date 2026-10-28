import { binarySearch, bubbleSort, insertionSort, linearSearch, mergeSort, queueTrace, selectionSort, stackTrace } from "./algorithms";
import { parseGraph, parseListOps, parseNumberList, parseOps, parseTarget, parseTree } from "./parse";
import { graphTraversal, linkedListTrace, treeTraversal } from "./structures";
import { InvalidInputError, type StructTrace, type Trace } from "./types";

export type AlgoId =
  | "linear-search" | "binary-search" | "bubble-sort" | "selection-sort" | "insertion-sort" | "merge-sort"
  | "stack" | "queue" | "linked-list" | "tree-preorder" | "tree-inorder" | "tree-postorder" | "tree-level-order" | "bfs" | "dfs";
export type InputKind = "list" | "search" | "stack" | "queue" | "linkedlist" | "tree" | "graph";
type Complexity = { best: string; average: string; worst: string; space: string; note: string };

const tree = (label: string, space: string, note: string) => ({
  label, input: "tree" as InputKind, complexity: { best: "O(n)", average: "O(n)", worst: "O(n)", space, note },
});

export const ALGORITHMS: Record<AlgoId, { label: string; input: InputKind; complexity: Complexity }> = {
  "linear-search": { label: "Linear search", input: "search", complexity: { best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(1)", note: "Works on any list." } },
  "binary-search": { label: "Binary search", input: "search", complexity: { best: "O(1)", average: "O(log n)", worst: "O(log n)", space: "O(1)", note: "Only valid on a list sorted in ascending order." } },
  "bubble-sort": { label: "Bubble sort", input: "list", complexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", note: "Best case O(n) because this version stops after a pass with no swaps." } },
  "selection-sort": { label: "Selection sort", input: "list", complexity: { best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", note: "Always makes the same comparisons; at most n−1 swaps." } },
  "insertion-sort": { label: "Insertion sort", input: "list", complexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", note: "Fast on nearly sorted lists." } },
  "merge-sort": { label: "Merge sort", input: "list", complexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", note: "Uses extra memory to merge halves." } },
  stack: { label: "Stack (LIFO)", input: "stack", complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(n)", note: "Push and pop each take constant time." } },
  queue: { label: "Queue (FIFO)", input: "queue", complexity: { best: "O(1)", average: "O(1)", worst: "O(1)", space: "O(n)", note: "Enqueue and dequeue each take constant time in a linked or circular implementation." } },
  "linked-list": { label: "Linked list: insert and delete", input: "linkedlist", complexity: { best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(1)", note: "Insert at the head is O(1). Insert at the tail (no tail pointer here), insert at an index and delete by value must walk the list, so they are O(n)." } },
  "tree-preorder": tree("Binary tree: preorder", "O(h)", "Node, then left, then right. h is the tree height; the call stack holds at most h nodes."),
  "tree-inorder": tree("Binary tree: inorder", "O(h)", "Left, then node, then right. On a binary search tree this visits values in sorted order."),
  "tree-postorder": tree("Binary tree: postorder", "O(h)", "Left, then right, then node. Children are always visited before their parent."),
  "tree-level-order": tree("Binary tree: level order", "O(w)", "Uses a queue, so memory is O(w) where w is the widest level."),
  bfs: { label: "Graph: breadth-first search", input: "graph", complexity: { best: "O(V+E)", average: "O(V+E)", worst: "O(V+E)", space: "O(V)", note: "Visits nodes in order of distance (fewest edges) from the start. V is nodes, E is edges." } },
  dfs: { label: "Graph: depth-first search", input: "graph", complexity: { best: "O(V+E)", average: "O(V+E)", worst: "O(V+E)", space: "O(V)", note: "Goes as deep as possible before backtracking. Recursion depth can reach V." } },
};

export type BuildResult =
  | { ok: true; kind: "array"; trace: Trace }
  | { ok: true; kind: "struct"; trace: StructTrace }
  | { ok: false; error: string };

type Extra = { tree?: string; edges?: string };
const arr = (trace: Trace): BuildResult => ({ ok: true, kind: "array", trace });
const struct = (trace: StructTrace): BuildResult => ({ ok: true, kind: "struct", trace });

/** `targetText` is the search target, or the start node for BFS/DFS. `opsText` is the operations for stack, queue and linked list. */
export function buildTrace(id: AlgoId, listText: string, targetText: string, opsText: string, extra: Extra = {}): BuildResult {
  try {
    const kind = ALGORITHMS[id].input;
    if (kind === "stack" || kind === "queue") {
      const ops = parseOps(opsText, kind);
      return arr(kind === "stack" ? stackTrace(ops) : queueTrace(ops));
    }
    if (kind === "linkedlist") return struct(linkedListTrace(parseNumberList(listText), parseListOps(opsText)));
    if (kind === "tree") {
      const t = id.replace("tree-", "") as "preorder" | "inorder" | "postorder" | "level-order";
      return struct(treeTraversal(t, parseTree(extra.tree ?? "")));
    }
    if (kind === "graph") return struct(graphTraversal(id as "bfs" | "dfs", parseGraph(extra.edges ?? "", targetText)));
    const list = parseNumberList(listText);
    switch (id) {
      case "linear-search": return arr(linearSearch(list, parseTarget(targetText)));
      case "binary-search": return arr(binarySearch(list, parseTarget(targetText)));
      case "bubble-sort": return arr(bubbleSort(list));
      case "selection-sort": return arr(selectionSort(list));
      case "insertion-sort": return arr(insertionSort(list));
      default: return arr(mergeSort(list));
    }
  } catch (e) {
    if (e instanceof InvalidInputError) return { ok: false, error: e.message };
    return { ok: false, error: "Could not build the visualization." };
  }
}
