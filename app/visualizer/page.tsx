import { Visualizer } from "@/components/visualizer";

export const metadata = { title: "Algorithm Visualizer | LearnOS" };

export default function VisualizerPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-3xl font-semibold">Algorithm Visualizer</h1>
      <p className="mt-1 mb-6 text-sm opacity-70">
        Step through searching, sorting, stacks and queues. Each step comes from a tested trace of the algorithm, not from running your own code.
      </p>
      <Visualizer />
    </main>
  );
}
