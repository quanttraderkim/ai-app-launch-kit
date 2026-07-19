const clone = (value) => JSON.parse(JSON.stringify(value));

const pointKey = ({ x, y }) => `${x},${y}`;
const compareIds = (a, b) => a.id.localeCompare(b.id, "en");
const SEARCH_CLONE = Symbol("search-clone");
const SEARCH_DIRECTIONS = Object.freeze([
  Object.freeze({ name: "right", x: 1, y: 0 }),
  Object.freeze({ name: "down", x: 0, y: 1 }),
  Object.freeze({ name: "left", x: -1, y: 0 }),
  Object.freeze({ name: "up", x: 0, y: -1 }),
]);

export function fnv1a32(text) {
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(String(text))) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((a, b) => a.localeCompare(b, "en"))
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalString(value) {
  return JSON.stringify(canonicalize(value));
}

function footprint(hole, anchor = hole.anchor) {
  return hole.shape.map((offset, slotIndex) => ({
    x: anchor.x + offset.x,
    y: anchor.y + offset.y,
    slotIndex,
  }));
}

function isActiveCell(level, cell) {
  return (
    cell.x >= 0 &&
    cell.y >= 0 &&
    cell.x < level.board.width &&
    cell.y < level.board.height &&
    level.board.mask[cell.y]?.[cell.x] === "1"
  );
}

function isShapeConnected(shape) {
  if (!shape.length) return false;
  const remaining = new Set(shape.map(pointKey));
  const queue = [shape[0]];
  remaining.delete(pointKey(shape[0]));
  while (queue.length) {
    const current = queue.shift();
    for (const next of [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ]) {
      const key = pointKey(next);
      if (remaining.delete(key)) queue.push(next);
    }
  }
  return remaining.size === 0;
}

export function validateLevel(level) {
  const errors = [];
  if (!level || level.schemaVersion !== 1) errors.push("LVL_SCHEMA_VERSION");
  if (!level?.board || !Number.isInteger(level.board.width) || !Number.isInteger(level.board.height)) {
    errors.push("LVL_BOARD_MISSING");
    return { valid: false, errors };
  }
  if (level.board.mask?.length !== level.board.height) errors.push("LVL_MASK_HEIGHT");
  for (const [y, row] of (level.board.mask ?? []).entries()) {
    if (row.length !== level.board.width) errors.push(`LVL_MASK_WIDTH:${y}`);
    if (!/^[01]+$/.test(row)) errors.push(`LVL_MASK_CHARACTER:${y}`);
  }

  const entities = [...(level.holes ?? []), ...(level.passengers ?? []), ...(level.obstacles ?? [])];
  const ids = new Set();
  for (const entity of entities) {
    if (!entity.id || ids.has(entity.id)) errors.push(`LVL_DUPLICATE_ID:${entity.id ?? "missing"}`);
    ids.add(entity.id);
  }

  const occupiedHoles = new Map();
  for (const hole of level.holes ?? []) {
    const shapeKeys = new Set(hole.shape?.map(pointKey));
    if (!hole.shape?.length || shapeKeys.size !== hole.shape.length || !isShapeConnected(hole.shape)) {
      errors.push(`LVL_SHAPE:${hole.id}`);
      continue;
    }
    if (
      !Array.isArray(hole.initialFilledSlots) ||
      new Set(hole.initialFilledSlots).size !== hole.initialFilledSlots.length ||
      hole.initialFilledSlots.some((index) => index < 0 || index >= hole.shape.length)
    ) {
      errors.push(`LVL_FILLED_SLOT:${hole.id}`);
    }
    for (const cell of footprint(hole)) {
      if (!isActiveCell(level, cell)) errors.push(`LVL_HOLE_OUT_OF_BOARD:${hole.id}:${pointKey(cell)}`);
      const key = pointKey(cell);
      if (occupiedHoles.has(key)) errors.push(`LVL_HOLE_OVERLAP:${hole.id}:${occupiedHoles.get(key)}`);
      occupiedHoles.set(key, hole.id);
    }
  }

  const passengerCells = new Set();
  for (const passenger of level.passengers ?? []) {
    const key = pointKey(passenger.cell);
    if (!isActiveCell(level, passenger.cell)) errors.push(`LVL_PASSENGER_OUT_OF_BOARD:${passenger.id}`);
    if (passengerCells.has(key)) errors.push(`LVL_PASSENGER_OVERLAP:${key}`);
    if (occupiedHoles.has(key)) errors.push(`LVL_INITIAL_OCCUPANCY:${passenger.id}`);
    passengerCells.add(key);
  }

  const colors = new Set([
    ...(level.holes ?? []).map((hole) => hole.colorId),
    ...(level.passengers ?? []).map((passenger) => passenger.colorId),
  ]);
  for (const colorId of colors) {
    const capacity = (level.holes ?? [])
      .filter((hole) => hole.colorId === colorId)
      .reduce((sum, hole) => sum + hole.shape.length - hole.initialFilledSlots.length, 0);
    const passengers = (level.passengers ?? []).filter((passenger) => passenger.colorId === colorId).length;
    if (capacity !== passengers) errors.push(`LVL_CAPACITY:${colorId}:${capacity}:${passengers}`);
  }

  return { valid: errors.length === 0, errors };
}

export function buildOrthogonalSweep(from, target) {
  if (![from?.x, from?.y, target?.x, target?.y].every(Number.isInteger)) {
    throw new TypeError("Orthogonal sweep endpoints must use integer coordinates.");
  }
  const cursor = { x: from.x, y: from.y };
  const steps = [];
  while (cursor.x !== target.x || cursor.y !== target.y) {
    const dx = target.x - cursor.x;
    const dy = target.y - cursor.y;
    if (dx !== 0 && (dy === 0 || Math.abs(dx) >= Math.abs(dy))) {
      cursor.x += Math.sign(dx);
    } else {
      cursor.y += Math.sign(dy);
    }
    steps.push({ ...cursor });
  }
  return steps;
}

export class PuzzleGame {
  constructor(level, internalMode = null, searchState = null) {
    if (internalMode === SEARCH_CLONE) {
      this.level = level;
      this.events = [];
      this.state = clone(searchState);
      return;
    }
    const validation = validateLevel(level);
    if (!validation.valid) throw new Error(`LEVEL_INVALID\n${validation.errors.join("\n")}`);
    this.level = clone(level);
    this.reset();
  }

  reset() {
    this.events = [];
    this.state = {
      levelId: this.level.id,
      status: "playing",
      tick: 0,
      sequence: 0,
      winCommitted: false,
      lastRejectedReason: null,
      holes: this.level.holes.map((hole) => ({
        ...clone(hole),
        filledSlots: [...hole.initialFilledSlots].sort((a, b) => a - b),
        runtimeStatus: "Idle",
      })),
      passengers: this.level.passengers.map(clone),
      obstacles: this.level.obstacles.map(clone),
    };
    return this.getSnapshot();
  }

  getSnapshot() {
    const holes = this.state.holes.map((hole) => ({
      id: hole.id,
      colorId: hole.colorId,
      anchor: { ...hole.anchor },
      shape: clone(hole.shape),
      filledSlots: [...hole.filledSlots],
      occupiedSlotMask: hole.shape.map((_, index) => hole.filledSlots.includes(index)),
      initialFilledSlots: [...hole.initialFilledSlots],
      runtimeStatus: hole.runtimeStatus,
      status: hole.runtimeStatus,
    }));
    return {
      levelId: this.state.levelId,
      board: clone(this.level.board),
      status: this.state.status,
      winCommitted: this.state.winCommitted,
      tick: this.state.tick,
      holes,
      activeHoles: holes.filter((hole) => hole.runtimeStatus !== "Removed"),
      activeHoleCount: holes.filter((hole) => hole.runtimeStatus !== "Removed").length,
      passengers: this.state.passengers.map(clone).sort(compareIds),
      remainingPassengerCount: this.state.passengers.length,
      lastRejectedReason: this.state.lastRejectedReason,
      eventQueueLength: 0,
    };
  }

  getEventLog() {
    return clone(this.events);
  }

  getStateHash() {
    const state = this.getSnapshot();
    const hashInput = {
      levelId: state.levelId,
      status: state.status,
      tick: state.tick,
      holes: state.holes
        .map((hole) => ({
          id: hole.id,
          anchor: hole.anchor,
          filledSlots: hole.filledSlots,
          runtimeStatus: hole.runtimeStatus,
        }))
        .sort(compareIds),
      passengers: state.passengers.map((passenger) => ({ id: passenger.id, cell: passenger.cell })),
    };
    return fnv1a32(canonicalString(hashInput)).toString(16).padStart(8, "0");
  }

  getSearchKey() {
    const state = this.getSnapshot();
    return canonicalString({
      status: state.status,
      holes: state.holes
        .map((hole) =>
          hole.runtimeStatus === "Removed"
            ? { id: hole.id, runtimeStatus: hole.runtimeStatus }
            : {
                id: hole.id,
                anchor: hole.anchor,
                filledSlots: hole.filledSlots,
                runtimeStatus: hole.runtimeStatus,
              },
        )
        .sort(compareIds),
      passengers: state.passengers.map((passenger) => ({ id: passenger.id, cell: passenger.cell })),
    });
  }

  cloneForSearch() {
    return new PuzzleGame(this.level, SEARCH_CLONE, this.state);
  }

  moveToward(holeId, target) {
    const hole = this.state.holes.find((candidate) => candidate.id === holeId);
    if (!hole) return this.#blocked("UnknownHole", holeId, []);
    if (!Number.isInteger(target?.x) || !Number.isInteger(target?.y)) {
      return this.#blocked("NonIntegerTarget", holeId, [{ ...hole.anchor }]);
    }
    const path = [{ ...hole.anchor }, ...buildOrthogonalSweep(hole.anchor, target)];
    return this.moveAlongPath(holeId, path);
  }

  moveAlongPath(holeId, path) {
    const eventStart = this.events.length;
    const hole = this.state.holes.find((candidate) => candidate.id === holeId);
    if (!hole) return this.#blocked("UnknownHole", holeId, [], eventStart);
    if (this.state.status !== "playing") return this.#blocked("GameNotPlaying", holeId, [hole.anchor], eventStart);
    if (hole.runtimeStatus === "Removed") return this.#blocked("HoleRemoved", holeId, [hole.anchor], eventStart);
    if (!Array.isArray(path) || path.length === 0 || pointKey(path[0]) !== pointKey(hole.anchor)) {
      return this.#blocked("PathMustStartAtAnchor", holeId, [hole.anchor], eventStart);
    }
    if (path.some((point) => !Number.isInteger(point?.x) || !Number.isInteger(point?.y))) {
      return this.#blocked("NonIntegerPath", holeId, [hole.anchor], eventStart);
    }

    const acceptedPath = [{ ...hole.anchor }];
    let rejectedReason = null;
    for (let index = 1; index < path.length; index += 1) {
      const next = path[index];
      const distance = Math.abs(next.x - hole.anchor.x) + Math.abs(next.y - hole.anchor.y);
      if (distance !== 1) {
        rejectedReason = "NonOrthogonalStep";
        break;
      }
      const entry = this.#canEnter(hole, next);
      if (!entry.allowed) {
        rejectedReason = entry.reason;
        break;
      }
      this.#enter(hole, next);
      acceptedPath.push({ ...next });
      if (hole.runtimeStatus === "Removed") break;
    }

    this.state.lastRejectedReason = rejectedReason;
    return {
      moved: acceptedPath.length > 1,
      completed: hole.runtimeStatus === "Removed",
      acceptedPath,
      rejectedReason,
      blockedReason: rejectedReason,
      events: clone(this.events.slice(eventStart)),
      snapshot: this.getSnapshot(),
      stateHash: this.getStateHash(),
    };
  }

  #blocked(reason, holeId, acceptedPath = [], eventStart = this.events.length) {
    this.state.lastRejectedReason = reason;
    return {
      moved: false,
      completed: false,
      acceptedPath: clone(acceptedPath),
      rejectedReason: reason,
      blockedReason: reason,
      events: clone(this.events.slice(eventStart)),
      snapshot: this.getSnapshot(),
      stateHash: this.getStateHash(),
      holeId,
    };
  }

  #canEnter(hole, nextAnchor) {
    const nextFootprint = footprint(hole, nextAnchor);
    for (const cell of nextFootprint) {
      if (cell.x < 0 || cell.y < 0 || cell.x >= this.level.board.width || cell.y >= this.level.board.height) {
        return { allowed: false, reason: "OutOfBoard" };
      }
      if (!isActiveCell(this.level, cell)) return { allowed: false, reason: "InactiveMaskCell" };
    }

    const nextKeys = new Set(nextFootprint.map(pointKey));
    for (const other of this.state.holes) {
      if (other.id === hole.id || other.runtimeStatus === "Removed") continue;
      if (footprint(other).some((cell) => nextKeys.has(pointKey(cell)))) {
        return { allowed: false, reason: "OverlapsHole" };
      }
    }
    for (const obstacle of this.state.obstacles) {
      if (obstacle.cells.some((cell) => nextKeys.has(pointKey(cell)))) {
        return { allowed: false, reason: "OverlapsSolidObstacle" };
      }
    }
    for (const cell of nextFootprint) {
      const passenger = this.state.passengers.find((candidate) => pointKey(candidate.cell) === pointKey(cell));
      if (!passenger) continue;
      if (hole.filledSlots.includes(cell.slotIndex)) {
        return { allowed: false, reason: "PassengerSlotAlreadyFilled" };
      }
      if (passenger.colorId !== hole.colorId) {
        return { allowed: false, reason: "PassengerMismatch" };
      }
    }
    return { allowed: true, reason: "Allowed" };
  }

  #enter(hole, nextAnchor) {
    hole.anchor = { ...nextAnchor };
    this.state.tick += 1;
    this.#emit("CellEntered", { holeId: hole.id, anchor: { ...hole.anchor } });

    for (const cell of footprint(hole).sort((a, b) => a.slotIndex - b.slotIndex)) {
      const passengerIndex = this.state.passengers.findIndex(
        (candidate) => pointKey(candidate.cell) === pointKey(cell),
      );
      if (passengerIndex < 0) continue;
      const passenger = this.state.passengers[passengerIndex];
      if (passenger.colorId !== hole.colorId || hole.filledSlots.includes(cell.slotIndex)) continue;
      this.state.passengers.splice(passengerIndex, 1);
      hole.filledSlots.push(cell.slotIndex);
      hole.filledSlots.sort((a, b) => a - b);
      this.#emit("PassengerCollected", {
        holeId: hole.id,
        colorId: hole.colorId,
        passengerId: passenger.id,
        slotIndex: cell.slotIndex,
        anchor: { ...hole.anchor },
      });
    }

    if (hole.filledSlots.length !== hole.shape.length) return;
    hole.runtimeStatus = "Completing";
    this.#emit("HoleCompleted", { holeId: hole.id, anchor: { ...hole.anchor } });
    hole.runtimeStatus = "Removed";
    this.#emit("HoleRemoved", { holeId: hole.id, anchor: { ...hole.anchor } });
    this.#emit("DeviceUpdated", { holeId: hole.id, changed: false });
    this.#emit("SpawnOrReveal", { holeId: hole.id, spawned: 0 });

    const won =
      this.state.passengers.length === 0 &&
      this.state.holes.every((candidate) => candidate.runtimeStatus === "Removed");
    this.#emit("ObjectiveEvaluated", { holeId: hole.id, won });
    if (won && !this.state.winCommitted) {
      this.state.winCommitted = true;
      this.state.status = "won";
      this.#emit("WinOrFailCommitted", { holeId: hole.id, outcome: "win" });
    }
  }

  #emit(type, fields = {}) {
    this.state.sequence += 1;
    this.events.push({
      seq: this.state.sequence,
      sequence: this.state.sequence,
      tick: this.state.tick,
      type,
      ...clone(fields),
    });
  }
}

function reconstructActions(nodes, goalIndex) {
  const actions = [];
  let cursor = goalIndex;
  while (cursor > 0) {
    actions.push(nodes[cursor].action);
    cursor = nodes[cursor].parent;
  }
  return actions.reverse();
}

function solverResult(status, fields) {
  return {
    status,
    solved: status === "solved",
    conclusive: status !== "validation-inconclusive",
    ...fields,
  };
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  get length() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.#compare(this.items[parent], item) <= 0) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }

  pop() {
    if (this.items.length === 0) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.items.length) break;
      let child = left;
      if (right < this.items.length && this.#compare(this.items[right], this.items[left]) < 0) {
        child = right;
      }
      if (this.#compare(this.items[child], last) >= 0) break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = last;
    return first;
  }

  #compare(left, right) {
    return left.priority - right.priority || left.depth - right.depth || left.order - right.order;
  }
}

function searchLowerBound(game) {
  const snapshot = game.getSnapshot();
  const colors = new Set(snapshot.passengers.map((passenger) => passenger.colorId));
  let total = 0;
  for (const colorId of colors) {
    const passengers = snapshot.passengers.filter((passenger) => passenger.colorId === colorId);
    const holes = snapshot.activeHoles.filter((hole) => hole.colorId === colorId);
    let colorBound = 0;
    for (const passenger of passengers) {
      let closest = Number.POSITIVE_INFINITY;
      for (const hole of holes) {
        for (let slotIndex = 0; slotIndex < hole.shape.length; slotIndex += 1) {
          if (hole.filledSlots.includes(slotIndex)) continue;
          const offset = hole.shape[slotIndex];
          const collectionAnchor = {
            x: passenger.cell.x - offset.x,
            y: passenger.cell.y - offset.y,
          };
          closest = Math.min(
            closest,
            Math.abs(hole.anchor.x - collectionAnchor.x) +
              Math.abs(hole.anchor.y - collectionAnchor.y),
          );
        }
      }
      colorBound = Math.max(colorBound, closest);
    }
    if (Number.isFinite(colorBound)) total += colorBound;
  }
  return total;
}

export function solveLevel(level, options = {}) {
  const configuredBudget = level?.generation?.solverValidation?.maximumVisitedStates;
  const configuredAlgorithm = level?.generation?.solverValidation?.algorithm;
  const maximumVisitedStates = options.maximumVisitedStates ?? configuredBudget ?? 100_000;
  const algorithm = options.algorithm ?? configuredAlgorithm ?? "bfs";
  if (!Number.isInteger(maximumVisitedStates) || maximumVisitedStates < 1) {
    throw new RangeError("maximumVisitedStates must be a positive integer.");
  }
  if (!new Set(["bfs", "a-star"]).has(algorithm)) {
    throw new RangeError(`Unsupported solver algorithm: ${algorithm}`);
  }

  const initial = new PuzzleGame(level);
  const initialSnapshot = initial.getSnapshot();
  const initialKey = initial.getSearchKey();
  const nodes = [{ game: initial, parent: -1, action: null, depth: 0, key: initialKey }];
  const bestDepth = new Map([[initialKey, 0]]);
  const queue = algorithm === "bfs" ? [0] : null;
  const heap = algorithm === "a-star" ? new MinHeap() : null;
  if (heap) heap.push({ nodeIndex: 0, priority: searchLowerBound(initial), depth: 0, order: 0 });
  let queueCursor = 0;
  let insertionOrder = 1;
  let expandedStates = 0;
  let generatedTransitions = 0;
  let legalTransitions = 0;
  let maximumFrontier = 1;
  let deepestDepth = 0;

  const frontierLength = () => (queue ? queue.length - queueCursor : heap.length);
  const pushFrontier = (nodeIndex, priority, depth) => {
    if (queue) queue.push(nodeIndex);
    else heap.push({ nodeIndex, priority, depth, order: insertionOrder++ });
  };
  const popFrontier = () => (queue ? queue[queueCursor++] : heap.pop()?.nodeIndex ?? null);

  if (initialSnapshot.status === "won") {
    return solverResult("solved", {
      algorithm,
      actions: [],
      solutionCellSteps: 0,
      visitedStates: 1,
      expandedStates: 0,
      generatedTransitions: 0,
      legalTransitions: 0,
      averageLegalBranching: 0,
      maximumFrontier: 1,
      finalStateHash: initial.getStateHash(),
    });
  }

  while (frontierLength() > 0) {
    const nodeIndex = popFrontier();
    const node = nodes[nodeIndex];
    if (bestDepth.get(node.key) !== node.depth) continue;

    if (node.game.getSnapshot().status === "won") {
      return solverResult("solved", {
        algorithm,
        actions: reconstructActions(nodes, nodeIndex),
        solutionCellSteps: node.depth,
        visitedStates: bestDepth.size,
        expandedStates,
        generatedTransitions,
        legalTransitions,
        averageLegalBranching: expandedStates === 0 ? 0 : legalTransitions / expandedStates,
        maximumFrontier,
        finalStateHash: node.game.getStateHash(),
      });
    }

    expandedStates += 1;
    const snapshot = node.game.getSnapshot();
    const activeHoles = snapshot.activeHoles.sort(compareIds);

    for (const hole of activeHoles) {
      for (const direction of SEARCH_DIRECTIONS) {
        generatedTransitions += 1;
        const nextAnchor = {
          x: hole.anchor.x + direction.x,
          y: hole.anchor.y + direction.y,
        };
        const candidate = node.game.cloneForSearch();
        const result = candidate.moveAlongPath(hole.id, [hole.anchor, nextAnchor]);
        if (!result.moved) continue;
        legalTransitions += 1;

        const key = candidate.getSearchKey();
        const nextDepth = node.depth + 1;
        const knownDepth = bestDepth.get(key);
        if (knownDepth !== undefined && knownDepth <= nextDepth) continue;
        if (knownDepth === undefined && bestDepth.size >= maximumVisitedStates) {
          return solverResult("validation-inconclusive", {
            algorithm,
            reason: "state-budget-exhausted",
            actions: [],
            solutionCellSteps: null,
            visitedStates: bestDepth.size,
            expandedStates,
            generatedTransitions,
            legalTransitions,
            averageLegalBranching: legalTransitions / expandedStates,
            maximumFrontier,
            deepestDepth,
          });
        }

        bestDepth.set(key, nextDepth);
        const action = {
          holeId: hole.id,
          direction: direction.name,
          fromAnchor: { ...hole.anchor },
          toAnchor: nextAnchor,
          collections: result.events
            .filter((event) => event.type === "PassengerCollected")
            .map((event) => ({ passengerId: event.passengerId, slotIndex: event.slotIndex })),
          holeRemoved: result.events.some((event) => event.type === "HoleRemoved"),
        };
        nodes.push({ game: candidate, parent: nodeIndex, action, depth: nextDepth, key });
        const childIndex = nodes.length - 1;
        const priority = nextDepth + (heap ? searchLowerBound(candidate) : 0);
        pushFrontier(childIndex, priority, nextDepth);
        deepestDepth = Math.max(deepestDepth, nextDepth);
        maximumFrontier = Math.max(maximumFrontier, frontierLength());
      }
    }
  }

  return solverResult("unsolvable", {
    algorithm,
    reason: "state-space-exhausted",
    actions: [],
    solutionCellSteps: null,
    visitedStates: bestDepth.size,
    expandedStates,
    generatedTransitions,
    legalTransitions,
    averageLegalBranching: expandedStates === 0 ? 0 : legalTransitions / expandedStates,
    maximumFrontier,
    deepestDepth,
  });
}

function directionBetween(left, right) {
  return `${Math.sign(right.x - left.x)},${Math.sign(right.y - left.y)}`;
}

export function analyzeLevelDifficulty(level, solver = solveLevel(level)) {
  const trace = level.solutionTrace ?? [];
  let recordedCellSteps = 0;
  let recordedDirectionChanges = 0;
  let recordedReversals = 0;
  let recordedCollections = 0;

  for (const step of trace) {
    const path = step.path ?? [];
    recordedCellSteps += Math.max(0, path.length - 1);
    recordedCollections += step.expectedCollections?.length ?? 0;
    let previousDirection = null;
    for (let index = 1; index < path.length; index += 1) {
      const direction = directionBetween(path[index - 1], path[index]);
      if (previousDirection && direction !== previousDirection) {
        recordedDirectionChanges += 1;
        const [px, py] = previousDirection.split(",").map(Number);
        const [cx, cy] = direction.split(",").map(Number);
        if (px === -cx && py === -cy) recordedReversals += 1;
      }
      previousDirection = direction;
    }
  }

  const optimalCellSteps = solver.solved ? solver.solutionCellSteps : null;
  return {
    levelId: level.id,
    solverStatus: solver.status,
    metrics: {
      optimalCellSteps,
      recordedCellSteps,
      recordedSolutionSlack:
        optimalCellSteps === null ? null : recordedCellSteps - optimalCellSteps,
      recordedPathConsistent:
        optimalCellSteps === null || recordedCellSteps >= optimalCellSteps,
      recordedDirectionChanges,
      recordedReversals,
      recordedCollections,
      activeHoleChoicesAtStart: level.holes?.length ?? 0,
      visitedStates: solver.visitedStates,
      expandedStates: solver.expandedStates,
      maximumFrontier: solver.maximumFrontier,
      averageLegalBranching: solver.averageLegalBranching,
      searchEffortBits: Math.log2(Math.max(1, solver.visitedStates)),
    },
    solver,
  };
}

function regionIndex(level, cell) {
  const { columns, rows } = level.generation.constraints.regionGrid;
  const regionX = Math.min(columns - 1, Math.floor((cell.x * columns) / level.board.width));
  const regionY = Math.min(rows - 1, Math.floor((cell.y * rows) / level.board.height));
  return { x: regionX, y: regionY, key: `${regionX},${regionY}` };
}

function maximumInWindow(passengers, width, height, windowSize, colorId = null) {
  if (width < windowSize || height < windowSize) return passengers.length;
  let maximum = 0;
  for (let y = 0; y <= height - windowSize; y += 1) {
    for (let x = 0; x <= width - windowSize; x += 1) {
      const count = passengers.filter(
        (passenger) =>
          (colorId === null || passenger.colorId === colorId) &&
          passenger.cell.x >= x &&
          passenger.cell.x < x + windowSize &&
          passenger.cell.y >= y &&
          passenger.cell.y < y + windowSize,
      ).length;
      maximum = Math.max(maximum, count);
    }
  }
  return maximum;
}

function largestOrthogonalCluster(passengers) {
  const pending = new Map(passengers.map((passenger) => [pointKey(passenger.cell), passenger]));
  let largest = 0;
  while (pending.size) {
    const start = pending.keys().next().value;
    const queue = [start];
    pending.delete(start);
    let size = 0;
    while (queue.length) {
      const key = queue.shift();
      size += 1;
      const [x, y] = key.split(",").map(Number);
      for (const neighbor of [`${x + 1},${y}`, `${x - 1},${y}`, `${x},${y + 1}`, `${x},${y - 1}`]) {
        if (pending.delete(neighbor)) queue.push(neighbor);
      }
    }
    largest = Math.max(largest, size);
  }
  return largest;
}

function minimumPairDistance(passengers) {
  if (passengers.length < 2) return Number.POSITIVE_INFINITY;
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < passengers.length; left += 1) {
    for (let right = left + 1; right < passengers.length; right += 1) {
      const a = passengers[left].cell;
      const b = passengers[right].cell;
      minimum = Math.min(minimum, Math.abs(a.x - b.x) + Math.abs(a.y - b.y));
    }
  }
  return minimum;
}

export function calculateSpreadReport(level) {
  const constraints = level.generation.constraints;
  const colorIds = [...new Set(level.passengers.map((passenger) => passenger.colorId))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
  const perColor = colorIds.map((colorId) => {
    const passengers = level.passengers.filter((passenger) => passenger.colorId === colorId);
    const metrics = {
      colorId,
      passengerCount: passengers.length,
      minimumManhattanDistance: minimumPairDistance(passengers),
      regionsOccupied: new Set(passengers.map((passenger) => regionIndex(level, passenger.cell).key)).size,
      largestCluster: largestOrthogonalCluster(passengers),
      maximumInAny2x2: maximumInWindow(
        passengers,
        level.board.width,
        level.board.height,
        2,
        colorId,
      ),
    };
    metrics.occupiedRegionCount = metrics.regionsOccupied;
    metrics.maximumClusterSize = metrics.largestCluster;
    metrics.maximumSameColorInAny2x2 = metrics.maximumInAny2x2;
    metrics.checks = {
      distance: metrics.minimumManhattanDistance >= constraints.minimumSameColorManhattanDistance,
      regions: metrics.regionsOccupied >= constraints.minimumRegionsPerColor,
      cluster: metrics.largestCluster <= constraints.maximumSameColorClusterSize,
      window2x2: metrics.maximumInAny2x2 <= constraints.maximumSameColorInAny2x2,
    };
    metrics.pass = Object.values(metrics.checks).every(Boolean);
    return metrics;
  });

  const regionCounts = new Map();
  for (const passenger of level.passengers) {
    const key = regionIndex(level, passenger.cell).key;
    regionCounts.set(key, (regionCounts.get(key) ?? 0) + 1);
  }
  const global = {
    occupiedRegions: regionCounts.size,
    maximumPerRegion: Math.max(0, ...regionCounts.values()),
    maximumInAny2x2: maximumInWindow(level.passengers, level.board.width, level.board.height, 2),
    maximumInAny3x3: maximumInWindow(level.passengers, level.board.width, level.board.height, 3),
  };
  global.occupiedRegionCount = global.occupiedRegions;
  global.maximumPassengersPerRegion = global.maximumPerRegion;
  global.maximumPassengersInAny2x2 = global.maximumInAny2x2;
  global.maximumPassengersInAny3x3 = global.maximumInAny3x3;
  global.checks = {
    occupiedRegions: global.occupiedRegions >= constraints.minimumOccupiedRegionsTotal,
    regionDensity: global.maximumPerRegion <= constraints.maximumPassengersPerRegion,
    window2x2: global.maximumInAny2x2 <= constraints.maximumPassengersInAny2x2,
    window3x3: global.maximumInAny3x3 <= constraints.maximumPassengersInAny3x3,
  };
  global.pass = Object.values(global.checks).every(Boolean);

  const colors = Object.fromEntries(perColor.map((metric) => [metric.colorId, metric]));
  const pass = perColor.every((metric) => metric.pass) && global.pass;
  const violations = [];
  for (const metric of perColor) {
    for (const [check, passed] of Object.entries(metric.checks)) {
      if (!passed) violations.push({ id: `${metric.colorId}:${check}`, message: `${metric.colorId} ${check}` });
    }
  }
  for (const [check, passed] of Object.entries(global.checks)) {
    if (!passed) violations.push({ id: `global:${check}`, message: `global ${check}` });
  }
  return {
    levelId: level.id,
    passengerCount: level.passengers.length,
    holeCount: level.holes.length,
    constraints: clone(constraints),
    perColor,
    colors,
    global,
    pass,
    allPassed: pass,
    violations,
  };
}
