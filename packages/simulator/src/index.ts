// packages/simulator — traffic/failure simulation engine.
// Graph input format + validation landed in Phase 3; the core tick engine
// lands in Phase 4, failure injection in Phase 5.
export * from "./graph";
export * from "./validate";
export * from "./simulate";
export * from "./summarize";
