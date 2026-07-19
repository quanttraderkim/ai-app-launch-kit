import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  PuzzleGame,
  analyzeLevelDifficulty,
  buildOrthogonalSweep,
  calculateSpreadReport,
  fnv1a32,
  solveLevel,
  validateLevel,
} from "../src/core.mjs";

const parseJson = async (url) => JSON.parse(await readFile(url, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

const canonicalTutorialUrl = new URL("../../Levels/tutorial-001.json", import.meta.url);
const canonicalSpreadUrl = new URL("../../Levels/spread-demo-002.json", import.meta.url);
const demoTutorialUrl = new URL("../data/tutorial-001.json", import.meta.url);
const demoSpreadUrl = new URL("../data/spread-demo-002.json", import.meta.url);

const [tutorial, spread] = await Promise.all([
  parseJson(demoTutorialUrl),
  parseJson(demoSpreadUrl),
]);

test("demo level copies stay equal to canonical level JSON", async () => {
  assert.deepEqual(tutorial, await parseJson(canonicalTutorialUrl));
  assert.deepEqual(spread, await parseJson(canonicalSpreadUrl));
});

test("FNV-1a reference vectors are platform-independent", () => {
  assert.equal(fnv1a32("1103|orange"), 199927524);
  assert.equal(fnv1a32("1103|orange|3|1"), 188663266);
  assert.equal(fnv1a32("424242|2"), 1483404589);
});

test("orthogonal sweep is cell-by-cell with horizontal tie break", () => {
  assert.deepEqual(buildOrthogonalSweep({ x: 0, y: 0 }, { x: 3, y: 2 }), [
    { x: 1, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
    { x: 3, y: 1 },
    { x: 3, y: 2 },
  ]);
  assert.throws(
    () => buildOrthogonalSweep({ x: 0, y: 0 }, { x: 1.5, y: 2 }),
    /integer coordinates/,
  );
});

test("non-integer model targets are rejected without changing state", () => {
  const game = new PuzzleGame(tutorial);
  const initialHash = game.getStateHash();
  const result = game.moveToward("orange-hole", { x: 1.5, y: 2 });
  assert.equal(result.rejectedReason, "NonIntegerTarget");
  assert.equal(game.getStateHash(), initialHash);
});

test("non-integer recorded path points are rejected without changing state", () => {
  const game = new PuzzleGame(tutorial);
  const initialHash = game.getStateHash();
  const result = game.moveAlongPath("orange-hole", [
    { x: 0, y: 2 },
    { x: 1.5, y: 2 },
  ]);
  assert.equal(result.rejectedReason, "NonIntegerPath");
  assert.equal(game.getStateHash(), initialHash);
});

test("tutorial keeps a partially filled tray active", () => {
  const game = new PuzzleGame(tutorial);
  const firstHalf = tutorial.solutionTrace[0].path.slice(0, 5);
  const result = game.moveAlongPath("orange-hole", firstHalf);
  const snapshot = game.getSnapshot();
  const hole = snapshot.holes.find((candidate) => candidate.id === "orange-hole");

  assert.equal(result.rejectedReason, null);
  assert.deepEqual(hole.filledSlots, [0]);
  assert.equal(hole.runtimeStatus, "Idle");
  assert.equal(snapshot.passengers.length, 1);
  assert.equal(snapshot.status, "playing");
  assert.deepEqual(
    result.events.filter((event) => event.type === "PassengerCollected").map((event) => [event.passengerId, event.slotIndex]),
    [["orange-top", 0]],
  );
});

test("second collection resolves completion, removal and win in stable order", () => {
  const game = new PuzzleGame(tutorial);
  game.moveAlongPath("orange-hole", tutorial.solutionTrace[0].path.slice(0, 5));
  const result = game.moveAlongPath("orange-hole", tutorial.solutionTrace[0].path.slice(4));
  const logicalTypes = result.events
    .map((event) => event.type)
    .filter((type) => type !== "CellEntered");

  assert.deepEqual(logicalTypes, [
    "PassengerCollected",
    "HoleCompleted",
    "HoleRemoved",
    "DeviceUpdated",
    "SpawnOrReveal",
    "ObjectiveEvaluated",
    "WinOrFailCommitted",
  ]);
  assert.equal(result.snapshot.status, "won");
  assert.equal(result.snapshot.activeHoleCount, 0);
  assert.equal(result.snapshot.remainingPassengerCount, 0);
  assert.equal(
    game.getEventLog().filter((event) => event.type === "WinOrFailCommitted").length,
    1,
  );
});

test("recorded tutorial trace replays through the same resolver", () => {
  const game = new PuzzleGame(tutorial);
  for (const step of tutorial.solutionTrace) {
    const result = game.moveAlongPath(step.holeId, step.path);
    assert.deepEqual(
      result.events
        .filter((event) => event.type === "PassengerCollected")
        .map((event) => ({ passengerId: event.passengerId, slotIndex: event.slotIndex })),
      step.expectedCollections,
    );
    assert.equal(result.completed, step.expectedHoleRemoved);
  }
  assert.equal(game.getSnapshot().status, "won");
});

test("a long sweep stops at the first board boundary", () => {
  const game = new PuzzleGame(tutorial);
  const result = game.moveToward("orange-hole", { x: 10, y: 2 });
  const hole = result.snapshot.holes.find((candidate) => candidate.id === "orange-hole");
  assert.equal(result.rejectedReason, "OutOfBoard");
  assert.deepEqual(hole.anchor, { x: 5, y: 2 });
  assert.deepEqual(result.acceptedPath.at(-1), { x: 5, y: 2 });
});

test("a mismatched passenger is solid and cannot be crossed", () => {
  const fixture = clone(tutorial);
  fixture.holes.push({
    id: "blue-hole",
    colorId: "blue",
    anchor: { x: 5, y: 5 },
    shape: [{ x: 0, y: 0 }],
    initialFilledSlots: [],
    traits: [],
  });
  fixture.passengers.push({
    id: "blue-blocker",
    colorId: "blue",
    cell: { x: 4, y: 2 },
    tags: [],
  });
  assert.equal(validateLevel(fixture).valid, true);

  const result = new PuzzleGame(fixture).moveToward("orange-hole", { x: 5, y: 2 });
  assert.equal(result.rejectedReason, "PassengerMismatch");
  assert.deepEqual(result.acceptedPath.at(-1), { x: 3, y: 2 });
  assert.equal(result.snapshot.passengers.some((passenger) => passenger.id === "blue-blocker"), true);
});

test("another active tray blocks the first overlapping cell", () => {
  const fixture = clone(tutorial);
  fixture.holes.push({
    id: "blue-hole",
    colorId: "blue",
    anchor: { x: 4, y: 2 },
    shape: [{ x: 0, y: 0 }],
    initialFilledSlots: [],
    traits: [],
  });
  fixture.passengers.push({
    id: "blue-target",
    colorId: "blue",
    cell: { x: 5, y: 5 },
    tags: [],
  });
  const result = new PuzzleGame(fixture).moveToward("orange-hole", { x: 5, y: 2 });
  assert.equal(result.rejectedReason, "OverlapsHole");
  assert.deepEqual(result.acceptedPath.at(-1), { x: 3, y: 2 });
});

test("a wall blocks a long sweep before its occupied cell", () => {
  const fixture = clone(tutorial);
  fixture.obstacles.push({ id: "wall-one", kind: "wall", cells: [{ x: 4, y: 2 }] });
  const result = new PuzzleGame(fixture).moveToward("orange-hole", { x: 5, y: 2 });
  assert.equal(result.rejectedReason, "OverlapsSolidObstacle");
  assert.deepEqual(result.acceptedPath.at(-1), { x: 3, y: 2 });
});

test("a passenger cannot enter an already filled local slot", () => {
  const fixture = clone(tutorial);
  fixture.holes[0].initialFilledSlots = [0];
  fixture.passengers = [
    { id: "orange-blocker", colorId: "orange", cell: { x: 4, y: 2 }, tags: [] },
  ];
  const result = new PuzzleGame(fixture).moveToward("orange-hole", { x: 5, y: 2 });
  assert.equal(result.rejectedReason, "PassengerSlotAlreadyFilled");
  assert.deepEqual(result.acceptedPath.at(-1), { x: 3, y: 2 });
});

test("an inactive mask cell blocks the footprint", () => {
  const fixture = clone(tutorial);
  fixture.board.mask[2] = "111101";
  const result = new PuzzleGame(fixture).moveToward("orange-hole", { x: 5, y: 2 });
  assert.equal(result.rejectedReason, "InactiveMaskCell");
  assert.deepEqual(result.acceptedPath.at(-1), { x: 3, y: 2 });
});

test("reset reconstructs the canonical initial state", () => {
  const game = new PuzzleGame(tutorial);
  const initialHash = game.getStateHash();
  game.moveAlongPath("orange-hole", tutorial.solutionTrace[0].path);
  assert.notEqual(game.getStateHash(), initialHash);
  game.reset();
  assert.equal(game.getStateHash(), initialHash);
  assert.equal(game.getEventLog().length, 0);
});

test("solver transposition key ignores reversible tick history", () => {
  const game = new PuzzleGame(tutorial);
  const initialSearchKey = game.getSearchKey();
  const initialReplayHash = game.getStateHash();
  game.moveAlongPath("orange-hole", [
    { x: 0, y: 2 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
  ]);
  assert.equal(game.getSearchKey(), initialSearchKey);
  assert.notEqual(game.getStateHash(), initialReplayHash);
});

test("independent BFS solves tutorial without reading its recorded trace", () => {
  const fixture = clone(tutorial);
  delete fixture.solutionTrace;
  const result = solveLevel(fixture, { algorithm: "bfs" });
  assert.equal(result.status, "solved");
  assert.equal(result.solutionCellSteps, 6);
  assert.equal(result.actions.length, 6);
  assert.equal(result.visitedStates, 64);

  const replay = new PuzzleGame(fixture);
  for (const action of result.actions) {
    const move = replay.moveAlongPath(action.holeId, [action.fromAnchor, action.toAnchor]);
    assert.equal(move.moved, true);
  }
  assert.equal(replay.getSnapshot().status, "won");

  const recordedReplay = new PuzzleGame(fixture);
  recordedReplay.moveAlongPath("orange-hole", tutorial.solutionTrace[0].path);
  assert.equal(recordedReplay.getSearchKey(), replay.getSearchKey());
  assert.notEqual(recordedReplay.getStateHash(), replay.getStateHash());
});

test("A-star uses the same resolver and preserves the optimal tutorial length", () => {
  const result = solveLevel(tutorial, { algorithm: "a-star" });
  assert.equal(result.status, "solved");
  assert.equal(result.solutionCellSteps, 6);
  assert.ok(result.visitedStates <= 43);
});

test("solver budget exhaustion is inconclusive rather than unsolvable", () => {
  const result = solveLevel(tutorial, { maximumVisitedStates: 1 });
  assert.equal(result.status, "validation-inconclusive");
  assert.equal(result.conclusive, false);
  assert.equal(result.reason, "state-budget-exhausted");
});

test("exhausting a finite isolated fixture reports unsolvable", () => {
  const fixture = clone(tutorial);
  fixture.board = {
    width: 3,
    height: 4,
    origin: "top-left",
    mask: ["001", "000", "100", "101"],
  };
  fixture.holes[0].anchor = { x: 0, y: 2 };
  fixture.passengers[0].cell = { x: 2, y: 0 };
  fixture.passengers[1].cell = { x: 2, y: 3 };
  delete fixture.solutionTrace;
  assert.equal(validateLevel(fixture).valid, true);

  const result = solveLevel(fixture, { maximumVisitedStates: 100 });
  assert.equal(result.status, "unsolvable");
  assert.equal(result.reason, "state-space-exhausted");
  assert.equal(result.visitedStates, 1);
});

test("difficulty report stays a metric vector instead of an arbitrary label", () => {
  const report = analyzeLevelDifficulty(tutorial);
  assert.equal(report.solverStatus, "solved");
  assert.deepEqual(
    {
      optimal: report.metrics.optimalCellSteps,
      recorded: report.metrics.recordedCellSteps,
      slack: report.metrics.recordedSolutionSlack,
      changes: report.metrics.recordedDirectionChanges,
      reversals: report.metrics.recordedReversals,
      collections: report.metrics.recordedCollections,
    },
    { optimal: 6, recorded: 6, slack: 0, changes: 3, reversals: 0, collections: 2 },
  );
  assert.equal(Object.hasOwn(report, "difficultyLabel"), false);
});

test("spread report matches the fixed anti-clumping expectations", () => {
  const report = calculateSpreadReport(spread);
  assert.equal(report.pass, true);
  assert.equal(report.violations.length, 0);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(report.colors).map(([colorId, value]) => [
        colorId,
        {
          distance: value.minimumManhattanDistance,
          regions: value.occupiedRegionCount,
          cluster: value.maximumClusterSize,
          window2x2: value.maximumSameColorInAny2x2,
        },
      ]),
    ),
    {
      blue: { distance: 5, regions: 3, cluster: 1, window2x2: 1 },
      green: { distance: 6, regions: 3, cluster: 1, window2x2: 1 },
      red: { distance: 5, regions: 3, cluster: 1, window2x2: 1 },
    },
  );
  assert.deepEqual(
    {
      regions: report.global.occupiedRegionCount,
      perRegion: report.global.maximumPassengersPerRegion,
      window2x2: report.global.maximumPassengersInAny2x2,
      window3x3: report.global.maximumPassengersInAny3x3,
    },
    { regions: 6, perRegion: 2, window2x2: 2, window3x3: 2 },
  );
});

test("a one-passenger color vacuously passes pairwise minimum distance", () => {
  const fixture = clone(spread);
  fixture.passengers = fixture.passengers.filter((passenger) => passenger.id === "red-right-top");
  const report = calculateSpreadReport(fixture);
  assert.equal(report.colors.red.minimumManhattanDistance, Number.POSITIVE_INFINITY);
  assert.equal(report.colors.red.checks.distance, true);
});
