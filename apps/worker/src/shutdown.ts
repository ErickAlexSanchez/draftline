export function bindStopSignals(stop: () => void): void {
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}
