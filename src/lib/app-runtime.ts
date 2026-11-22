import { Effect, Layer, Logger, ManagedRuntime, References } from "effect";

import { ProjectService } from "./project-service";

const isDev = import.meta.env.DEV;

const LoggerLayer = Logger.layer([isDev ? Logger.consolePrettyBrowser() : Logger.consoleJson]).pipe(
  Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, isDev ? "Debug" : "Info")),
);

/** One runtime for the app; React code goes through `runProject` below. */
export const appRuntime = ManagedRuntime.make(
  ProjectService.layer.pipe(Layer.provideMerge(LoggerLayer)),
);

export function runProject<A, E>(
  use: (service: ProjectService["Service"]) => Effect.Effect<A, E>,
): Promise<A> {
  return appRuntime.runPromise(ProjectService.use(use));
}
