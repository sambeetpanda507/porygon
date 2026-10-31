// Runs the tick engine off the main thread so the canvas stays responsive
// while a simulation is playing. Framework-agnostic by design: all the
// actual math lives in @porygon/simulator, which has no DOM dependency and
// is safe to import into a worker.
import { computeTick, type Graph, type SimulationTick, type TrafficSpec } from "@porygon/simulator";

export interface StartCommand {
  type: "start";
  graph: Graph;
  traffic: TrafficSpec;
  tickIntervalMs: number;
}

export interface StopCommand {
  type: "stop";
}

export interface ResetCommand {
  type: "reset";
}

export type WorkerCommand = StartCommand | StopCommand | ResetCommand;

export interface TickMessage {
  type: "tick";
  result: SimulationTick;
}

export type WorkerMessage = TickMessage;

let intervalId: ReturnType<typeof setInterval> | null = null;
let tick = 0;

function stopTicking(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

self.onmessage = (event: MessageEvent<WorkerCommand>): void => {
  const command = event.data;

  if (command.type === "start") {
    stopTicking();
    intervalId = setInterval(() => {
      tick += 1;
      const result: SimulationTick = computeTick(command.graph, command.traffic, tick);
      const message: TickMessage = { type: "tick", result };
      self.postMessage(message);
    }, command.tickIntervalMs);
    return;
  }

  if (command.type === "stop") {
    stopTicking();
    return;
  }

  if (command.type === "reset") {
    stopTicking();
    tick = 0;
  }
};
