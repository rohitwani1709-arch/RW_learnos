export type EventType =
  | "compare" | "swap" | "write" | "visit_node" | "push" | "pop"
  | "enqueue" | "dequeue" | "found" | "not_found" | "return";

export type TraceEvent = {
  type: EventType;
  indices: number[];                       // positions to highlight in `array`
  array: number[];                         // full state AFTER this event
  vars: Record<string, number | string>;   // named variables to show
  message: string;                         // plain-language explanation
  range?: [number, number];                // active search window (binary search, merge sort)
};

export type Trace = { initial: number[]; events: TraceEvent[] };

export class InvalidInputError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidInputError"; }
}

// ---- Structure traces (linked lists, trees, graphs) ----
export type VNode = { id: number; label: string; x: number; y: number };
export type VEdge = { from: number; to: number; directed: boolean };
export type StructEvent = {
  type: EventType;
  nodes: VNode[];
  edges: VEdge[];
  current: number | null;      // node id being acted on
  visited: number[];           // node ids already visited, in order
  frontier: number[];          // queue (BFS / level-order) or call stack (DFS / recursive traversals)
  message: string;
  vars: Record<string, number | string>;
};
export type StructTrace = { initial: { nodes: VNode[]; edges: VEdge[] }; events: StructEvent[] };
