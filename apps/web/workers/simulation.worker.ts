// Runs the tick engine off the main thread so the canvas stays responsive
// while a simulation is playing. Framework-agnostic by design: all the
// actual math lives in @porygon/simulator, which has no DOM dependency and
// is safe to import into a worker.
import {
  computeTick,
  type FailureInjection,
  type Graph,
  type SimulationTick,
  type TrafficSpec,
} from "@porygon/simulator";

export interface StartCommand {
  type: "start";
  graph: Graph;
  traffic: TrafficSpec;
  tickIntervalMs: number;
  failures: readonly FailureInjection[];
}

export interface SetFailuresCommand {
  type: "set-failures";
  failures: readonly FailureInjection[];
}

export interface StopCommand {
  type: "stop";
}

export interface ResetCommand {
  type: "reset";
}

export type WorkerCommand = StartCommand | SetFailuresCommand | StopCommand | ResetCommand;

export interface TickMessage {
  type: "tick";
  result: SimulationTick;
}

export type WorkerMessage = TickMessage;

let intervalId: ReturnType<typeof setInterval> | null = null;
let tick = 0;
let activeFailures: readonly FailureInjection[] = [];

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
    activeFailures = command.failures;
    intervalId = setInterval(() => {
      tick += 1;
      const result: SimulationTick = computeTick(command.graph, command.traffic, tick, activeFailures);
      const message: TickMessage = { type: "tick", result };
      self.postMessage(message);
    }, command.tickIntervalMs);
    return;
  }

  if (command.type === "set-failures") {
    // Applies starting with the next scheduled tick — no need to restart
    // the interval or reset the tick counter for a failure toggle.
    activeFailures = command.failures;
    return;
  }

  if (command.type === "stop") {
    stopTicking();
    return;
  }

  if (command.type === "reset") {
    stopTicking();
    tick = 0;
    activeFailures = [];
  }
};
