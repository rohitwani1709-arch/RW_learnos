import { describe, it, expect } from "vitest";
import { graphTraversal, linkedListTrace, treeTraversal } from "@/lib/visualizer/structures";
import { parseGraph, parseListOps, parseTree } from "@/lib/visualizer/parse";
import { InvalidInputError, type StructTrace } from "@/lib/visualizer/types";
import { buildTrace } from "@/lib/visualizer";

const last = (t: StructTrace) => t.events[t.events.length - 1];
const visitLabels = (t: StructTrace) =>
  t.events.filter((e) => e.type === "visit_node").map((e) => e.nodes.find((n) => n.id === e.current)!.label);
const finalList = (t: StructTrace) => last(t).nodes.map((n) => n.label);

let seed = 987;
const rnd = (n: number) => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed % n; };

describe("parseTree", () => {
  it("accepts gaps marked with _", () => {
    expect(parseTree("8, 3, 10, 1, 6, _, 14")).toEqual([8, 3, 10, 1, 6, null, 14]);
  });
  it.each([["", /at least one/i], ["_, 1", /root/i], ["5, _, 3, 1", /no parent/i], [Array(16).fill("1").join(","), /at most/i], ["a, 1", /whole number/i]])(
    "rejects %j", (text, msg) => { expect(() => parseTree(text)).toThrow(msg); });
});

describe("tree traversals", () => {
  const vals = parseTree("8, 3, 10, 1, 6, _, 14");
  it("preorder is node, left, right", () => expect(visitLabels(treeTraversal("preorder", vals))).toEqual(["8", "3", "1", "6", "10", "14"]));
  it("inorder is left, node, right (sorted for a BST)", () => expect(visitLabels(treeTraversal("inorder", vals))).toEqual(["1", "3", "6", "8", "10", "14"]));
  it("postorder is left, right, node", () => expect(visitLabels(treeTraversal("postorder", vals))).toEqual(["1", "6", "3", "14", "10", "8"]));
  it("level order goes row by row", () => expect(visitLabels(treeTraversal("level-order", vals))).toEqual(["8", "3", "10", "1", "6", "14"]));
  it("single node tree works for every traversal", () => {
    for (const k of ["preorder", "inorder", "postorder", "level-order"] as const) {
      expect(visitLabels(treeTraversal(k, [7]))).toEqual(["7"]);
    }
  });
  it("call stack depth equals tree height and ends empty", () => {
    const t = treeTraversal("preorder", vals);
    expect(Math.max(...t.events.map((e) => e.frontier.length))).toBe(3);
    expect(last(t).frontier).toEqual([]);
  });
  it("level order queue ends empty and every visit happens once", () => {
    const t = treeTraversal("level-order", vals);
    expect(last(t).frontier).toEqual([]);
    expect(new Set(last(t).visited).size).toBe(6);
  });
  it("lays out nodes inside the drawing area", () => {
    const t = treeTraversal("preorder", parseTree("1,2,3,4,5,6,7,8,9,10,11,12,13,14,15"));
    t.initial.nodes.forEach((n) => { expect(n.x).toBeGreaterThan(0); expect(n.x).toBeLessThan(600); });
  });
});

describe("parseGraph", () => {
  it("normalises and de-duplicates edges", () => {
    const g = parseGraph("1-0, 0-1, 2-1", "0");
    expect(g.edges).toEqual([[0, 1], [1, 2]]);
    expect(g.nodes).toEqual([0, 1, 2]);
  });
  it.each([["", "0", /at least one/i], ["0-a", "0", /not an edge/i], ["0-10", "0", /0 to 9/], ["3-3", "0", /self-loop/i], ["0-1", "x", /start node/i]])(
    "rejects edges %j start %j", (e, s, msg) => { expect(() => parseGraph(e, s)).toThrow(msg); });
  it("rejects more than 20 edges", () => {
    const many = Array.from({ length: 21 }, (_, i) => `${i % 9}-${(i % 9) + 1}-x`).join(",");
    expect(() => parseGraph(many, "0")).toThrow(InvalidInputError);
  });
});

describe("BFS and DFS", () => {
  const g = parseGraph("0-1, 0-2, 1-3, 2-3, 3-4", "0");
  it("BFS visits level by level", () => expect(visitLabels(graphTraversal("bfs", g))).toEqual(["0", "1", "2", "3", "4"]));
  it("DFS goes deep first, exploring neighbours in ascending order", () => expect(visitLabels(graphTraversal("dfs", g))).toEqual(["0", "1", "3", "2", "4"]));
  it("only visits nodes reachable from the start", () => {
    const d = parseGraph("0-1, 2-3", "0");
    expect(visitLabels(graphTraversal("bfs", d))).toEqual(["0", "1"]);
    expect(visitLabels(graphTraversal("dfs", d))).toEqual(["0", "1"]);
  });
  it("handles a start node that has no edges", () => {
    const iso = parseGraph("0-1", "5");
    expect(visitLabels(graphTraversal("bfs", iso))).toEqual(["5"]);
  });
  it("terminates on cycles and visits each node once", () => {
    const cyc = parseGraph("0-1, 1-2, 2-0", "0");
    expect(visitLabels(graphTraversal("dfs", cyc))).toEqual(["0", "1", "2"]);
    expect(visitLabels(graphTraversal("bfs", cyc))).toEqual(["0", "1", "2"]);
  });
  it("matches an independent reference on 200 random graphs", () => {
    for (let k = 0; k < 200; k++) {
      const edgeText = Array.from({ length: 1 + rnd(14) }, () => { const a = rnd(10); let b = rnd(10); if (b === a) b = (a + 1) % 10; return `${a}-${b}`; }).join(",");
      const start = String(rnd(10));
      const graph = parseGraph(edgeText, start);
      // reference BFS distances
      const adj = new Map<number, number[]>();
      graph.edges.forEach(([a, b]) => { adj.set(a, [...(adj.get(a) ?? []), b]); adj.set(b, [...(adj.get(b) ?? []), a]); });
      const dist = new Map<number, number>([[graph.start, 0]]);
      const q = [graph.start];
      while (q.length) { const u = q.shift()!; for (const v of adj.get(u) ?? []) if (!dist.has(v)) { dist.set(v, dist.get(u)! + 1); q.push(v); } }
      const bfs = visitLabels(graphTraversal("bfs", graph)).map(Number);
      const dfs = visitLabels(graphTraversal("dfs", graph)).map(Number);
      expect(new Set(bfs)).toEqual(new Set(dist.keys()));
      expect(new Set(dfs)).toEqual(new Set(dist.keys()));
      expect(bfs).toHaveLength(dist.size);
      expect(dfs).toHaveLength(dist.size);
      const d = bfs.map((n) => dist.get(n)!);
      expect([...d].sort((x, y) => x - y)).toEqual(d); // nondecreasing distance
    }
  });
});

describe("parseListOps", () => {
  it("parses every operation", () => {
    expect(parseListOps("insert_head 5, insert_tail 6, insert_at 1 7, delete 5")).toEqual([
      { op: "insert_head", value: 5 }, { op: "insert_tail", value: 6 }, { op: "insert_at", index: 1, value: 7 }, { op: "delete", value: 5 }]);
  });
  it.each(["", "insert_head", "insert_at 1", "delete 1 2", "sort 3", "insert_head 100"])("rejects %j", (s) => {
    expect(() => parseListOps(s)).toThrow(InvalidInputError);
  });
});

describe("linked list", () => {
  const run = (list: number[], ops: string) => linkedListTrace(list, parseListOps(ops));
  it("inserts at the head", () => expect(finalList(run([1, 2], "insert_head 5"))).toEqual(["5", "1", "2"]));
  it("inserts at the tail after walking the list", () => {
    const t = run([1, 2], "insert_tail 5");
    expect(finalList(t)).toEqual(["1", "2", "5"]);
    expect(t.events.filter((e) => e.type === "visit_node")).toHaveLength(2);
  });
  it("inserts at an index", () => expect(finalList(run([1, 2, 3], "insert_at 1 9"))).toEqual(["1", "9", "2", "3"]));
  it("treats insert_at 0 as head and insert_at length as tail", () => {
    expect(finalList(run([1, 2], "insert_at 0 7"))).toEqual(["7", "1", "2"]);
    expect(finalList(run([1, 2], "insert_at 2 7"))).toEqual(["1", "2", "7"]);
  });
  it("leaves the list unchanged for an out-of-range index", () => {
    const t = run([1, 2], "insert_at 5 9");
    expect(t.events[0].message).toMatch(/out of range/i);
    expect(finalList(t)).toEqual(["1", "2"]);
  });
  it("works on an empty list", () => {
    expect(finalList(run([], "insert_tail 4"))).toEqual(["4"]);
    expect(finalList(run([], "insert_head 4"))).toEqual(["4"]);
  });
  it("deletes the head, a middle node and the tail", () => {
    expect(finalList(run([1, 2, 3], "delete 1"))).toEqual(["2", "3"]);
    expect(finalList(run([1, 2, 3], "delete 2"))).toEqual(["1", "3"]);
    expect(finalList(run([1, 2, 3], "delete 3"))).toEqual(["1", "2"]);
  });
  it("deletes only the first occurrence of a duplicate", () => {
    expect(finalList(run([4, 7, 7], "delete 7"))).toEqual(["4", "7"]);
  });
  it("reports not_found when deleting a missing value or from an empty list", () => {
    expect(run([1, 2], "delete 9").events.some((e) => e.type === "not_found")).toBe(true);
    expect(run([], "delete 1").events.some((e) => e.type === "not_found")).toBe(true);
  });
  it("deleting the only node leaves an empty list", () => {
    const t = run([5], "delete 5");
    expect(finalList(t)).toEqual([]);
    expect(last(t).message).toMatch(/empty/i);
  });
  it("keeps node ids unique and edges consistent in every event", () => {
    const t = run([1, 2, 3], "insert_head 9, insert_tail 8, insert_at 2 7, delete 2, delete 9");
    for (const e of t.events) {
      const ids = e.nodes.map((n) => n.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(e.edges).toHaveLength(Math.max(0, ids.length - 1));
      e.edges.forEach((ed, i) => { expect(ed.from).toBe(ids[i]); expect(ed.to).toBe(ids[i + 1]); });
    }
  });
  it("matches a plain-array model on 200 random operation sequences", () => {
    for (let k = 0; k < 200; k++) {
      const init = Array.from({ length: rnd(5) }, () => rnd(10));
      const model = [...init];
      const ops: string[] = [];
      for (let i = 0; i < 1 + rnd(10); i++) {
        const v = rnd(10);
        switch (rnd(4)) {
          case 0: ops.push(`insert_head ${v}`); model.unshift(v); break;
          case 1: ops.push(`insert_tail ${v}`); model.push(v); break;
          case 2: { const idx = rnd(model.length + 3); ops.push(`insert_at ${idx} ${v}`); if (idx <= model.length) model.splice(idx, 0, v); break; }
          default: { ops.push(`delete ${v}`); const at = model.indexOf(v); if (at >= 0) model.splice(at, 1); }
        }
      }
      expect(finalList(run(init, ops.join(","))).map(Number)).toEqual(model);
    }
  });
});

describe("buildTrace for structures", () => {
  it("builds each structure and reports bad input as an error", () => {
    expect(buildTrace("tree-inorder", "", "", "", { tree: "2, 1, 3" })).toMatchObject({ ok: true, kind: "struct" });
    expect(buildTrace("bfs", "", "0", "", { edges: "0-1" })).toMatchObject({ ok: true, kind: "struct" });
    expect(buildTrace("linked-list", "1, 2", "", "delete 1")).toMatchObject({ ok: true, kind: "struct" });
    expect(buildTrace("tree-inorder", "", "", "", { tree: "5, _, 3, 1" })).toMatchObject({ ok: false });
    expect(buildTrace("dfs", "", "z", "", { edges: "0-1" })).toMatchObject({ ok: false });
    expect(buildTrace("bubble-sort", "3, 1", "", "")).toMatchObject({ ok: true, kind: "array" });
  });
});
