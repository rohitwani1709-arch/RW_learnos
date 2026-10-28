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
