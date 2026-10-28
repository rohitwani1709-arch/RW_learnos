import type { EventType, StructEvent, StructTrace, VEdge, VNode } from "./types";
import type { Graph, ListOp } from "./parse";

class StructRecorder {
  visited: number[] = [];
  frontier: number[] = [];
  events: StructEvent[] = [];
  constructor(public nodes: VNode[], public edges: VEdge[]) {}
  emit(type: EventType, current: number | null, message: string, vars: StructEvent["vars"] = {}) {
    this.events.push({ type, nodes: this.nodes, edges: this.edges, current, visited: [...this.visited], frontier: [...this.frontier], message, vars });
  }
  trace(): StructTrace { return { initial: { nodes: this.nodes, edges: this.edges }, events: this.events }; }
}

// ---------------- Binary trees (heap-indexed level-order input) ----------------
function buildTree(vals: (number | null)[]) {
  const nodes: VNode[] = [];
  const edges: VEdge[] = [];
  vals.forEach((v, i) => {
    if (v === null) return;
    const depth = Math.floor(Math.log2(i + 1));
    const pos = i + 1 - 2 ** depth;
    nodes.push({ id: i, label: String(v), x: Math.round(((pos + 0.5) / 2 ** depth) * 560) + 20, y: depth * 80 + 40 });
    if (i > 0) edges.push({ from: Math.floor((i - 1) / 2), to: i, directed: false });
  });
  return { nodes, edges };
}
const childOf = (vals: (number | null)[], i: number, side: 0 | 1) => {
  const c = 2 * i + 1 + side;
  return c < vals.length && vals[c] !== null ? c : null;
};

export type TreeKind = "preorder" | "inorder" | "postorder" | "level-order";

export function treeTraversal(kind: TreeKind, vals: (number | null)[]): StructTrace {
  const { nodes, edges } = buildTree(vals);
  const r = new StructRecorder(nodes, edges);
  const label = (i: number) => String(vals[i]);
  const list = (ids: number[]) => ids.map(label).join(" ") || "(empty)";
  const vars = (stackName: string) => ({ order: list(r.visited), [stackName]: list(r.frontier) });
  const visit = (i: number, stackName: string) => {
    r.visited.push(i);
    r.emit("visit_node", i, `Visit ${label(i)}: add it to the output.`, vars(stackName));
  };

  if (kind === "level-order") {
    r.frontier = [0];
    r.emit("enqueue", 0, `Add the root ${label(0)} to the queue.`, vars("queue"));
    while (r.frontier.length > 0) {
      const i = r.frontier.shift() as number;
      r.emit("dequeue", i, `Remove ${label(i)} from the front of the queue.`, vars("queue"));
      visit(i, "queue");
      for (const side of [0, 1] as const) {
        const c = childOf(vals, i, side);
        if (c !== null) { r.frontier.push(c); r.emit("enqueue", c, `Add child ${label(c)} to the back of the queue.`, vars("queue")); }
      }
    }
  } else {
    const walk = (i: number) => {
      r.frontier.push(i);
      r.emit("push", i, `Enter node ${label(i)} (it joins the call stack).`, vars("call_stack"));
      if (kind === "preorder") visit(i, "call_stack");
      const l = childOf(vals, i, 0);
      if (l !== null) walk(l);
      if (kind === "inorder") visit(i, "call_stack");
      const rt = childOf(vals, i, 1);
      if (rt !== null) walk(rt);
      if (kind === "postorder") visit(i, "call_stack");
      r.frontier.pop();
      r.emit("pop", i, `Finished node ${label(i)}; return to its parent.`, vars("call_stack"));
    };
    walk(0);
  }
  r.emit("return", null, `Traversal complete. Order: ${list(r.visited)}.`, { order: list(r.visited) });
  return r.trace();
}

// ---------------- Graphs: BFS and DFS ----------------
export function graphTraversal(kind: "bfs" | "dfs", g: Graph): StructTrace {
  const n = g.nodes.length;
  const nodes: VNode[] = g.nodes.map((id, k) => {
    const angle = (2 * Math.PI * k) / n - Math.PI / 2;
    return { id, label: String(id), x: Math.round(300 + 220 * Math.cos(angle)), y: Math.round(170 + 130 * Math.sin(angle)) };
  });
  const edges: VEdge[] = g.edges.map(([a, b]) => ({ from: a, to: b, directed: false }));
  const adj = new Map<number, number[]>(g.nodes.map((id) => [id, []]));
  g.edges.forEach(([a, b]) => { adj.get(a)?.push(b); adj.get(b)?.push(a); });
  adj.forEach((v) => v.sort((x, y) => x - y)); // neighbours are explored in ascending order

  const r = new StructRecorder(nodes, edges);
  const list = (ids: number[]) => ids.join(" ") || "(empty)";

  if (kind === "bfs") {
    const discovered = new Set<number>([g.start]);
    r.frontier = [g.start];
    r.emit("enqueue", g.start, `Add the start node ${g.start} to the queue.`, { queue: list(r.frontier), order: list(r.visited) });
    while (r.frontier.length > 0) {
      const u = r.frontier.shift() as number;
      r.emit("dequeue", u, `Remove ${u} from the front of the queue.`, { queue: list(r.frontier), order: list(r.visited) });
      r.visited.push(u);
      r.emit("visit_node", u, `Visit ${u}.`, { queue: list(r.frontier), order: list(r.visited) });
      for (const nb of adj.get(u) ?? []) {
        if (discovered.has(nb)) continue;
        discovered.add(nb);
        r.frontier.push(nb);
        r.emit("enqueue", nb, `${nb} is a new neighbour of ${u}; add it to the back of the queue.`, { queue: list(r.frontier), order: list(r.visited) });
      }
    }
  } else {
    const seen = new Set<number>();
    const walk = (u: number) => {
      seen.add(u);
      r.frontier.push(u);
      r.emit("push", u, `Go to ${u} (it joins the call stack).`, { call_stack: list(r.frontier), order: list(r.visited) });
      r.visited.push(u);
      r.emit("visit_node", u, `Visit ${u}.`, { call_stack: list(r.frontier), order: list(r.visited) });
      for (const nb of adj.get(u) ?? []) if (!seen.has(nb)) walk(nb);
      r.frontier.pop();
      r.emit("pop", u, `Every neighbour of ${u} has been visited; backtrack.`, { call_stack: list(r.frontier), order: list(r.visited) });
    };
    walk(g.start);
  }
  r.emit("return", null, `Done. Visit order: ${list(r.visited)}. Only nodes reachable from ${g.start} are visited.`, { order: list(r.visited) });
  return r.trace();
}

// ---------------- Singly linked list ----------------
const MAX_LIST_NODES = 25;

export function linkedListTrace(initial: number[], ops: ListOp[]): StructTrace {
  let nextId = 0;
  const model = initial.map((v) => ({ id: nextId++, v }));
  const snap = () => ({
    nodes: model.map((m, i): VNode => ({ id: m.id, label: String(m.v), x: 50 + i * 70, y: 60 })),
    edges: model.slice(1).map((m, i): VEdge => ({ from: model[i].id, to: m.id, directed: true })),
  });
  const events: StructEvent[] = [];
  const emit = (type: EventType, current: number | null, message: string) => {
    const s = snap();
    events.push({ type, nodes: s.nodes, edges: s.edges, current, visited: [], frontier: [], message, vars: { size: model.length } });
  };
  const first = snap();

  const insertAt = (index: number, v: number) => {
    const node = { id: nextId++, v };
    model.splice(index, 0, node);
    return node;
  };

  for (const o of ops) {
    const len = model.length;
    if (o.op !== "delete" && len >= MAX_LIST_NODES) {
      emit("return", null, `This demo holds at most ${MAX_LIST_NODES} nodes; nothing changes.`);
      continue;
    }
    if (o.op === "insert_head" || (o.op === "insert_at" && o.index === 0)) {
      const node = insertAt(0, o.value);
      emit("write", node.id, len === 0
        ? `The list was empty, so the new node ${o.value} becomes the head.`
        : `Create a node holding ${o.value}, point it at the old head, then make it the new head.`);
    } else if (o.op === "insert_tail" || (o.op === "insert_at" && o.index === len)) {
      for (let k = 0; k < len; k++) {
        emit("visit_node", model[k].id, k < len - 1
          ? `At node ${model[k].v}. Its next is not empty, so move on.`
          : `At node ${model[k].v}. Its next is empty, so this is the tail.`);
      }
      const node = insertAt(len, o.value);
      emit("write", node.id, len === 0
        ? `The list was empty, so the new node ${o.value} becomes the head.`
        : `Point the tail's next at a new node holding ${o.value}.`);
    } else if (o.op === "insert_at") {
      const idx = o.index as number;
      if (idx > len) { emit("return", null, `Index ${idx} is out of range for a list of ${len}; nothing changes.`); continue; }
      for (let k = 0; k < idx; k++) {
        emit("visit_node", model[k].id, k < idx - 1
          ? `Walk past node ${model[k].v} (position ${k}).`
          : `Stop at node ${model[k].v} (position ${k}); the new node goes right after it.`);
      }
      const node = insertAt(idx, o.value);
      emit("write", node.id, `Link the new node ${o.value} between its neighbours: previous.next points to it, and it points to the next node.`);
    } else {
      let removed = false;
      for (let k = 0; k < len; k++) {
        emit("compare", model[k].id, `Is ${model[k].v} equal to ${o.value}?`);
        if (model[k].v === o.value) {
          emit("found", model[k].id, `Found ${o.value} at position ${k}.`);
          const prev = k > 0 ? model[k - 1].id : null;
          model.splice(k, 1);
          emit("write", prev ?? (model[0]?.id ?? null), k === 0
            ? `Move the head pointer past the deleted node.`
            : `Point the previous node's next at the node after the deleted one, which unlinks it.`);
          removed = true;
          break;
        }
      }
      if (!removed) emit("not_found", null, `${o.value} is not in the list; nothing changes.`);
    }
  }
  emit("return", null, `Done. The list is: ${model.map((m) => m.v).join(" → ") || "(empty)"}.`);
  return { initial: first, events };
}
