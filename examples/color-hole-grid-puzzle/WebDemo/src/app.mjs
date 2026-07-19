import { PuzzleGame, analyzeLevelDifficulty, calculateSpreadReport } from "./core.mjs";

const LEVEL_URLS = {
  tutorial: new URL("../data/tutorial-001.json", import.meta.url),
  spread: new URL("../data/spread-demo-002.json", import.meta.url),
};

const COLOR_META = {
  orange: { symbol: "✦", label: "Orange · dot" },
  red: { symbol: "▲", label: "Red · stripe" },
  blue: { symbol: "≈", label: "Blue · wave" },
  green: { symbol: "✚", label: "Green · cross" },
};

const els = {
  app: document.querySelector("#app"),
  loadStatus: document.querySelector("#load-status"),
  loadStatusText: document.querySelector("#load-status-text"),
  tabs: [...document.querySelectorAll("[data-tab]")],
  playPanel: document.querySelector("#play-panel"),
  auditPanel: document.querySelector("#audit-panel"),
  playBoard: document.querySelector("#play-board"),
  auditBoard: document.querySelector("#audit-board"),
  slotPips: document.querySelector("#slot-pips"),
  slotCount: document.querySelector("#slot-count"),
  objectiveTitle: document.querySelector("#objective-title"),
  objectiveDetail: document.querySelector("#objective-detail"),
  modelState: document.querySelector("#model-state"),
  lastEvent: document.querySelector("#last-event"),
  solverState: document.querySelector("#solver-state"),
  solverRoute: document.querySelector("#solver-route"),
  stateHash: document.querySelector("#state-hash"),
  resetButton: document.querySelector("#reset-button"),
  replayButton: document.querySelector("#replay-button"),
  victoryOverlay: document.querySelector("#victory-overlay"),
  victoryReset: document.querySelector("#victory-reset"),
  auditPass: document.querySelector("#audit-pass"),
  colorLegend: document.querySelector("#color-legend"),
  colorMetrics: document.querySelector("#color-metrics"),
  globalMetrics: document.querySelector("#global-metrics"),
  auditFootnote: document.querySelector("#audit-footnote"),
  toast: document.querySelector("#toast"),
};

let tutorialLevel;
let spreadLevel;
let game;
let spreadReport;
let difficultyReport;
let playLayers;
let auditLayers;
let pointerDrag = null;
let replayRun = 0;
let replayActive = false;
let lastSnapshot = null;
let lastRenderedSequence = 0;
let toastTimer = 0;

bindStaticControls();
initialize().catch(showFatalError);

async function initialize() {
  setControlsDisabled(true);
  [tutorialLevel, spreadLevel] = await Promise.all([
    loadJson(LEVEL_URLS.tutorial),
    loadJson(LEVEL_URLS.spread),
  ]);

  game = new PuzzleGame(tutorialLevel);
  difficultyReport = analyzeLevelDifficulty(tutorialLevel);
  spreadReport = normalizeSpreadReport(calculateSpreadReport(spreadLevel), spreadLevel);
  playLayers = buildBoard(els.playBoard, tutorialLevel.board);
  auditLayers = buildBoard(els.auditBoard, spreadLevel.board, { audit: true });

  renderPlay({ announceEffects: false });
  renderSolverAudit();
  renderSpreadAudit();
  exposeTestHook();
  setControlsDisabled(false);
  setLoadState("ready", "Model ready");
  els.app.setAttribute("aria-busy", "false");
}

function renderSolverAudit() {
  const solved = difficultyReport.solverStatus === "solved";
  const metrics = difficultyReport.metrics;
  els.solverState.textContent = solved
    ? `${difficultyReport.solver.algorithm.toUpperCase()} · ${metrics.visitedStates} states`
    : difficultyReport.solverStatus;
  els.solverRoute.textContent = solved
    ? `${metrics.optimalCellSteps} cells · ${metrics.recordedSolutionSlack} slack`
    : "No certified route";
}

async function loadJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Could not load ${url.pathname} (${response.status}).`);
  }
  return response.json();
}

function bindStaticControls() {
  for (const tab of els.tabs) {
    tab.addEventListener("click", () => setTab(tab.dataset.tab, { focus: false }));
    tab.addEventListener("keydown", handleTabKeydown);
  }

  els.resetButton.addEventListener("click", resetGame);
  els.victoryReset.addEventListener("click", resetGame);
  els.replayButton.addEventListener("click", () => {
    void autoSolve();
  });

  els.playBoard.addEventListener("pointerdown", handlePointerDown);
  els.playBoard.addEventListener("pointermove", handlePointerMove);
  els.playBoard.addEventListener("pointerup", finishPointerDrag);
  els.playBoard.addEventListener("pointercancel", finishPointerDrag);
  els.playBoard.addEventListener("lostpointercapture", finishPointerDrag);
  els.playBoard.addEventListener("keydown", handleBoardKeydown);

  window.addEventListener("blur", cancelPointerDrag);
  window.addEventListener("resize", cancelPointerDrag, { passive: true });
  window.addEventListener("orientationchange", cancelPointerDrag, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelPointerDrag();
  });
}

function handleTabKeydown(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const current = els.tabs.indexOf(event.currentTarget);
  let next = current;
  if (event.key === "ArrowLeft") next = (current - 1 + els.tabs.length) % els.tabs.length;
  if (event.key === "ArrowRight") next = (current + 1) % els.tabs.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = els.tabs.length - 1;
  setTab(els.tabs[next].dataset.tab, { focus: true });
}

function setTab(requestedTab, { focus = false } = {}) {
  const tabName = requestedTab === "spread" ? "audit" : requestedTab;
  if (!new Set(["play", "audit"]).has(tabName)) {
    throw new Error(`Unknown tab: ${requestedTab}`);
  }

  for (const tab of els.tabs) {
    const selected = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  }

  els.playPanel.hidden = tabName !== "play";
  els.auditPanel.hidden = tabName !== "audit";
  if (tabName !== "play") cancelPointerDrag();
  return tabName;
}

function buildBoard(boardElement, board, { audit = false } = {}) {
  boardElement.classList.remove("is-loading");
  boardElement.style.setProperty("--board-cols", String(board.width));
  boardElement.style.setProperty("--board-rows", String(board.height));
  boardElement.replaceChildren();

  const cellLayer = createElement("div", "grid-layer cell-layer");
  const entityLayer = createElement("div", "grid-layer entity-layer");
  const effectLayer = createElement("div", "grid-layer effect-layer");
  cellLayer.style.setProperty("--board-cols", String(board.width));
  cellLayer.style.setProperty("--board-rows", String(board.height));
  entityLayer.style.setProperty("--board-cols", String(board.width));
  entityLayer.style.setProperty("--board-rows", String(board.height));
  effectLayer.style.setProperty("--board-cols", String(board.width));
  effectLayer.style.setProperty("--board-rows", String(board.height));

  for (let y = 0; y < board.height; y += 1) {
    for (let x = 0; x < board.width; x += 1) {
      const cell = createElement("span", "board-cell");
      cell.style.gridColumn = String(x + 1);
      cell.style.gridRow = String(y + 1);
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      if (board.mask[y]?.[x] !== "1") cell.classList.add("is-inactive");
      cellLayer.append(cell);
    }
  }

  boardElement.append(cellLayer, entityLayer);
  let regionLayer = null;
  if (audit) {
    regionLayer = createElement("div", "region-layer");
    boardElement.append(regionLayer);
  }
  boardElement.append(effectLayer);
  return { cellLayer, entityLayer, effectLayer, regionLayer };
}

function renderPlay({ announceEffects = true } = {}) {
  if (!game || !playLayers) return null;
  const snapshot = game.getSnapshot();
  const events = game.getEventLog();
  const freshEvents = events.filter((event) => eventSequence(event) > lastRenderedSequence);

  renderPlayEntities(snapshot);
  renderPlayChrome(snapshot, events);
  if (announceEffects && freshEvents.length > 0) {
    renderEventEffects(freshEvents, lastSnapshot);
  }

  lastRenderedSequence = events.reduce(
    (highest, event) => Math.max(highest, eventSequence(event)),
    lastRenderedSequence,
  );
  lastSnapshot = snapshot;
  return snapshot;
}

function renderPlayEntities(snapshot) {
  playLayers.entityLayer.replaceChildren();
  for (const passenger of snapshot.passengers) {
    playLayers.entityLayer.append(createPassenger(passenger));
  }
  for (const hole of snapshot.holes) {
    if (hole.runtimeStatus === "Removed") continue;
    playLayers.entityLayer.append(createHole(hole));
  }
}

function createPassenger(passenger) {
  const passengerElement = createElement("div", "passenger");
  const meta = getColorMeta(passenger.colorId);
  passengerElement.dataset.color = passenger.colorId;
  passengerElement.dataset.passengerId = passenger.id;
  passengerElement.dataset.cellX = String(passenger.cell.x);
  passengerElement.dataset.cellY = String(passenger.cell.y);
  passengerElement.style.gridColumn = String(passenger.cell.x + 1);
  passengerElement.style.gridRow = String(passenger.cell.y + 1);
  passengerElement.setAttribute("aria-label", `${meta.label} passenger at ${passenger.cell.x}, ${passenger.cell.y}`);

  const mark = createElement("span", "passenger-mark", meta.symbol);
  mark.setAttribute("aria-hidden", "true");
  passengerElement.append(mark);
  return passengerElement;
}

function createHole(hole) {
  const xs = hole.shape.map((offset) => offset.x);
  const ys = hole.shape.map((offset) => offset.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX + 1;
  const height = Math.max(...ys) - minY + 1;
  const occupied = hole.occupiedSlotMask ?? hole.shape.map((_, index) => hole.filledSlots.includes(index));
  const filledCount = occupied.filter(Boolean).length;
  const meta = getColorMeta(hole.colorId);

  const tray = createElement("div", "hole-tray");
  tray.dataset.holeId = hole.id;
  tray.dataset.color = hole.colorId;
  tray.dataset.anchorX = String(hole.anchor.x);
  tray.dataset.anchorY = String(hole.anchor.y);
  tray.style.gridColumn = `${hole.anchor.x + minX + 1} / span ${width}`;
  tray.style.gridRow = `${hole.anchor.y + minY + 1} / span ${height}`;
  tray.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
  tray.style.gridTemplateRows = `repeat(${height}, minmax(0, 1fr))`;
  tray.tabIndex = replayActive ? -1 : 0;
  tray.setAttribute("role", "button");
  tray.setAttribute(
    "aria-label",
    `${meta.label} tray, ${filledCount} of ${hole.shape.length} slots filled. Drag or use arrow keys.`,
  );
  if (pointerDrag?.holeId === hole.id) tray.classList.add("is-dragging");

  hole.shape.forEach((offset, slotIndex) => {
    const slot = createElement("span", "hole-slot");
    slot.dataset.color = hole.colorId;
    slot.dataset.slotIndex = String(slotIndex);
    slot.style.gridColumn = String(offset.x - minX + 1);
    slot.style.gridRow = String(offset.y - minY + 1);
    const isFilled = Boolean(occupied[slotIndex]);
    slot.classList.toggle("is-filled", isFilled);
    slot.setAttribute("aria-hidden", "true");
    slot.append(createElement("span", "hole-slot-mark", isFilled ? meta.symbol : "·"));
    tray.append(slot);
  });
  return tray;
}

function renderPlayChrome(snapshot, events) {
  const firstDefinition = tutorialLevel.holes[0];
  const activeHole = snapshot.holes.find((hole) => hole.id === firstDefinition.id);
  const capacity = firstDefinition.shape.length;
  const filled = activeHole
    ? activeHole.occupiedSlotMask.filter(Boolean).length
    : snapshot.status === "won"
      ? capacity
      : 0;

  els.slotPips.replaceChildren();
  for (let index = 0; index < capacity; index += 1) {
    const pip = createElement("span", "slot-pip");
    pip.classList.toggle("is-filled", index < filled);
    els.slotPips.append(pip);
  }
  els.slotCount.textContent = `${filled} / ${capacity}`;

  if (snapshot.status === "won" || snapshot.winCommitted) {
    els.objectiveTitle.textContent = "Route complete";
    els.objectiveDetail.textContent = "The model committed one win after clearing the board.";
    els.modelState.textContent = "Won · input locked";
  } else if (filled > 0) {
    els.objectiveTitle.textContent = "1 marker remains";
    els.objectiveDetail.textContent = "The filled slot stays attached while the tray moves.";
    els.modelState.textContent = `Playing · ${snapshot.remainingPassengerCount} remaining`;
  } else {
    els.objectiveTitle.textContent = "Find 2 sun markers";
    els.objectiveDetail.textContent = "The tray remains solid after the first match.";
    els.modelState.textContent = `Playing · ${snapshot.remainingPassengerCount} remaining`;
  }

  const finalEvent = events.at(-1);
  els.lastEvent.textContent = finalEvent ? formatEvent(finalEvent) : "None yet";
  els.stateHash.textContent = String(game.getStateHash());
  els.victoryOverlay.hidden = !(snapshot.status === "won" || snapshot.winCommitted);
  els.replayButton.disabled = replayActive;
  els.resetButton.disabled = replayActive;
  if (snapshot.status === "won" && lastSnapshot?.status !== "won") {
    requestAnimationFrame(() => els.victoryReset.focus({ preventScroll: true }));
  }
}

function renderEventEffects(events, previousSnapshot) {
  const latestCollectionAnchor = new Map();
  for (const event of events) {
    if (event.type === "PassengerCollected") {
      if (event.anchor) latestCollectionAnchor.set(event.holeId, event.anchor);
      const passenger = tutorialLevel.passengers.find((candidate) => candidate.id === event.passengerId);
      if (passenger) addGridEffect("collection-burst", passenger.cell, event.colorId ?? "orange");
    }
    if (event.type === "HoleCompleted") {
      const hole = previousSnapshot?.holes.find((candidate) => candidate.id === event.holeId);
      const anchor = event.anchor ?? latestCollectionAnchor.get(event.holeId) ?? hole?.anchor;
      if (anchor) addGridEffect("completion-ring", anchor, hole?.colorId ?? "orange");
    }
  }
}

function addGridEffect(className, cell, colorId) {
  const effect = createElement("span", className);
  effect.dataset.color = colorId;
  effect.style.gridColumn = String(cell.x + 1);
  effect.style.gridRow = String(cell.y + 1);
  effect.addEventListener("animationend", () => effect.remove(), { once: true });
  playLayers.effectLayer.append(effect);
  window.setTimeout(() => effect.remove(), 900);
}

function handlePointerDown(event) {
  if (!game || replayActive || event.button !== 0 || pointerDrag) return;
  const tray = event.target.closest(".hole-tray");
  if (!tray || !els.playBoard.contains(tray)) return;
  const snapshot = game.getSnapshot();
  if (snapshot.status !== "playing") return;
  const hole = snapshot.holes.find((candidate) => candidate.id === tray.dataset.holeId);
  if (!hole) return;

  event.preventDefault();
  const point = pointerToGrid(event.clientX, event.clientY, tutorialLevel.board);
  pointerDrag = {
    pointerId: event.pointerId,
    holeId: hole.id,
    grabOffset: { x: point.x - hole.anchor.x, y: point.y - hole.anchor.y },
    requestedAnchor: { ...hole.anchor },
  };
  els.playBoard.setPointerCapture(event.pointerId);
  renderPlay({ announceEffects: false });
}

function handlePointerMove(event) {
  if (!game || !pointerDrag || event.pointerId !== pointerDrag.pointerId || replayActive) return;
  event.preventDefault();
  const snapshot = game.getSnapshot();
  const point = pointerToGrid(event.clientX, event.clientY, tutorialLevel.board);
  const target = {
    x: Math.round(point.x - pointerDrag.grabOffset.x),
    y: Math.round(point.y - pointerDrag.grabOffset.y),
  };
  if (target.x === pointerDrag.requestedAnchor.x && target.y === pointerDrag.requestedAnchor.y) return;

  pointerDrag.requestedAnchor = target;
  const result = game.moveToward(pointerDrag.holeId, target);
  const nextSnapshot = renderPlay();
  if (result.blockedReason) showToast(humanizeBlockedReason(result.blockedReason));
  if (nextSnapshot?.status === "won" || nextSnapshot?.activeHoles?.length === 0) {
    finishPointerDrag(event);
  }
}

function finishPointerDrag(event) {
  if (!pointerDrag) return;
  if (event?.pointerId != null && event.pointerId !== pointerDrag.pointerId) return;
  const pointerId = pointerDrag.pointerId;
  pointerDrag = null;
  if (els.playBoard.hasPointerCapture?.(pointerId)) {
    els.playBoard.releasePointerCapture(pointerId);
  }
  renderPlay({ announceEffects: false });
}

function cancelPointerDrag() {
  if (!pointerDrag) return;
  finishPointerDrag({ pointerId: pointerDrag.pointerId });
}

function pointerToGrid(clientX, clientY, board) {
  const bounds = els.playBoard.getBoundingClientRect();
  return {
    x: ((clientX - bounds.left) / bounds.width) * board.width,
    y: ((clientY - bounds.top) / bounds.height) * board.height,
  };
}

function handleBoardKeydown(event) {
  if (!game || replayActive || !event.key.startsWith("Arrow")) return;
  const deltaByKey = {
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
  };
  const delta = deltaByKey[event.key];
  if (!delta) return;
  const snapshot = game.getSnapshot();
  if (snapshot.status !== "playing") return;
  const requestedId = event.target.closest?.(".hole-tray")?.dataset.holeId;
  const hole = snapshot.holes.find((candidate) => candidate.id === requestedId) ?? snapshot.holes[0];
  if (!hole) return;

  event.preventDefault();
  const result = game.moveToward(hole.id, {
    x: hole.anchor.x + delta.x,
    y: hole.anchor.y + delta.y,
  });
  renderPlay();
  const rejectedReason = result.blockedReason ?? result.rejectedReason;
  if (rejectedReason) showToast(humanizeBlockedReason(rejectedReason));
  requestAnimationFrame(() => {
    els.playBoard.querySelector(`[data-hole-id="${cssEscape(hole.id)}"]`)?.focus({ preventScroll: true });
  });
}

function resetGame() {
  if (!game) return null;
  const shouldRestoreBoardFocus =
    game.getSnapshot().status === "won" || document.activeElement === els.victoryReset;
  replayRun += 1;
  replayActive = false;
  cancelPointerDrag();
  game.reset();
  playLayers.effectLayer.replaceChildren();
  lastRenderedSequence = 0;
  lastSnapshot = null;
  const snapshot = renderPlay({ announceEffects: false });
  setControlsDisabled(false);
  if (shouldRestoreBoardFocus) {
    requestAnimationFrame(() => {
      els.playBoard.querySelector(".hole-tray")?.focus({ preventScroll: true });
    });
  }
  return snapshot;
}

async function autoSolve() {
  if (!game || replayActive) return game?.getSnapshot() ?? null;
  const runId = ++replayRun;
  replayActive = true;
  cancelPointerDrag();
  game.reset();
  playLayers.effectLayer.replaceChildren();
  lastRenderedSequence = 0;
  lastSnapshot = null;
  setControlsDisabled(true);
  renderPlay({ announceEffects: false });

  const delayMs = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 20 : 165;
  try {
    for (const step of tutorialLevel.solutionTrace) {
      for (const target of step.path.slice(1)) {
        if (runId !== replayRun) return game.getSnapshot();
        game.moveToward(step.holeId, target);
        renderPlay();
        await delay(delayMs);
      }
    }
    return game.getSnapshot();
  } finally {
    if (runId === replayRun) {
      replayActive = false;
      setControlsDisabled(false);
      renderPlay({ announceEffects: false });
    }
  }
}

function renderSpreadAudit() {
  auditLayers.entityLayer.replaceChildren();
  auditLayers.regionLayer.replaceChildren();
  for (const passenger of spreadLevel.passengers) {
    auditLayers.entityLayer.append(createPassenger(passenger));
  }
  renderRegionOverlay();
  renderLegend();
  renderSpreadMetrics();
}

function renderRegionOverlay() {
  const grid = spreadReport.constraints.regionGrid;
  for (let column = 1; column < grid.columns; column += 1) {
    const line = createElement("span", "region-line is-vertical");
    const firstCell = Math.ceil((column * spreadLevel.board.width) / grid.columns);
    line.style.left = `${(firstCell / spreadLevel.board.width) * 100}%`;
    auditLayers.regionLayer.append(line);
  }
  for (let row = 1; row < grid.rows; row += 1) {
    const line = createElement("span", "region-line is-horizontal");
    const firstCell = Math.ceil((row * spreadLevel.board.height) / grid.rows);
    line.style.top = `${(firstCell / spreadLevel.board.height) * 100}%`;
    auditLayers.regionLayer.append(line);
  }
  for (let row = 0; row < grid.rows; row += 1) {
    for (let column = 0; column < grid.columns; column += 1) {
      const label = createElement("span", "region-label", `${String.fromCharCode(65 + row)}${column + 1}`);
      const firstColumnCell = Math.ceil((column * spreadLevel.board.width) / grid.columns);
      const firstRowCell = Math.ceil((row * spreadLevel.board.height) / grid.rows);
      label.style.left = `${(firstColumnCell / spreadLevel.board.width) * 100}%`;
      label.style.top = `${(firstRowCell / spreadLevel.board.height) * 100}%`;
      auditLayers.regionLayer.append(label);
    }
  }
}

function renderLegend() {
  els.colorLegend.replaceChildren();
  for (const colorId of Object.keys(spreadReport.colors).sort()) {
    const meta = getColorMeta(colorId);
    const item = createElement("span", "legend-item");
    const symbol = createElement("span", "legend-symbol", meta.symbol);
    symbol.dataset.color = colorId;
    symbol.setAttribute("aria-hidden", "true");
    item.append(symbol, document.createTextNode(meta.label));
    els.colorLegend.append(item);
  }
}

function renderSpreadMetrics() {
  const constraints = spreadReport.constraints;
  let allChecksPass = true;
  els.colorMetrics.replaceChildren();

  for (const [colorId, metrics] of Object.entries(spreadReport.colors).sort(([a], [b]) => a.localeCompare(b))) {
    const checks = [
      metricCheck("Distance", metrics.minimumManhattanDistance, constraints.minimumSameColorManhattanDistance, "min"),
      metricCheck("Regions", metrics.occupiedRegionCount, constraints.minimumRegionsPerColor, "min"),
      metricCheck("Cluster", metrics.maximumClusterSize, constraints.maximumSameColorClusterSize, "max"),
      metricCheck("2×2", metrics.maximumSameColorInAny2x2, constraints.maximumSameColorInAny2x2, "max"),
    ];
    const colorPass = checks.every((check) => check.pass);
    allChecksPass &&= colorPass;

    const card = createElement("article", "color-metric-card");
    const heading = createElement("div", "color-card-heading");
    const name = createElement("span", "color-name");
    const swatch = createElement("i", "color-swatch");
    swatch.dataset.color = colorId;
    name.append(swatch, document.createTextNode(`${getColorMeta(colorId).symbol} ${colorId}`));
    const status = createElement("span", `mini-pass${colorPass ? "" : " is-fail"}`, colorPass ? "PASS" : "CHECK");
    heading.append(name, status);

    const grid = createElement("div", "metric-grid");
    checks.forEach((check) => grid.append(createMetricCell(check)));
    card.append(heading, grid);
    els.colorMetrics.append(card);
  }

  const globalChecks = [
    metricCheck("Regions occupied", spreadReport.global.occupiedRegionCount, constraints.minimumOccupiedRegionsTotal, "min"),
    metricCheck("Max per region", spreadReport.global.maximumPassengersPerRegion, constraints.maximumPassengersPerRegion, "max"),
    metricCheck("Any 2×2", spreadReport.global.maximumPassengersInAny2x2, constraints.maximumPassengersInAny2x2, "max"),
    metricCheck("Any 3×3", spreadReport.global.maximumPassengersInAny3x3, constraints.maximumPassengersInAny3x3, "max"),
  ];
  allChecksPass &&= globalChecks.every((check) => check.pass);
  els.globalMetrics.replaceChildren(...globalChecks.map(createGlobalMetric));

  const noViolations = spreadReport.violations.length === 0;
  const auditPasses = allChecksPass && noViolations;
  els.auditPass.classList.toggle("is-pass", auditPasses);
  els.auditPass.classList.toggle("is-fail", !auditPasses);
  els.auditPass.replaceChildren(
    createElement("span", "", auditPasses ? "✓" : "!"),
    createElement("span", "", auditPasses ? "All constraints pass" : `${spreadReport.violations.length} checks need attention`),
  );
  els.auditFootnote.textContent = auditPasses
    ? `${spreadReport.passengerCount} passengers · ${spreadReport.holeCount} holes · ${spreadReport.global.occupiedRegionCount} regions occupied. Read-only audit passed.`
    : `Read-only audit found: ${spreadReport.violations.map(formatViolation).join("; ")}`;
}

function metricCheck(label, actual, limit, direction) {
  const pass = direction === "min" ? actual >= limit : actual <= limit;
  return { label, actual, limit, direction, pass };
}

function createMetricCell(check) {
  const cell = createElement("div", `metric-cell${check.pass ? "" : " is-fail"}`);
  cell.append(
    createElement("span", "", check.label),
    createElement("strong", "", `${formatMetric(check.actual)} / ${check.direction === "min" ? "≥" : "≤"}${check.limit}`),
  );
  return cell;
}

function createGlobalMetric(check) {
  const cell = createElement("div", `global-metric${check.pass ? "" : " is-fail"}`);
  cell.append(
    createElement("span", "", check.label),
    createElement("strong", "", `${formatMetric(check.actual)} · ${check.direction === "min" ? "min" : "max"} ${check.limit}`),
  );
  return cell;
}

function moveTo(arg1, arg2) {
  if (!game) throw new Error("Puzzle model is not ready.");
  let holeId;
  let target;
  if (typeof arg1 === "string") {
    holeId = arg1;
    target = arg2;
  } else {
    target = arg1;
    holeId = typeof arg2 === "string" ? arg2 : game.getSnapshot().holes[0]?.id;
  }
  if (!holeId || !target || !Number.isInteger(target.x) || !Number.isInteger(target.y)) {
    throw new TypeError("moveTo expects ({x, y}, optionalHoleId) or (holeId, {x, y}).");
  }
  const result = game.moveToward(holeId, target);
  renderPlay();
  return result;
}

function exposeTestHook() {
  window.__PUZZLE_TEST__ = Object.freeze({
    ready: true,
    getSnapshot: () => game.getSnapshot(),
    getEventLog: () => game.getEventLog(),
    getStateHash: () => game.getStateHash(),
    reset: resetGame,
    moveTo,
    autoSolve,
    setTab: (tabName) => setTab(tabName, { focus: false }),
    getDistributionReport: () => cloneData(spreadReport),
    getDifficultyReport: () => cloneData(difficultyReport),
  });
}

function setControlsDisabled(disabled) {
  if (disabled && !replayActive) {
    els.resetButton.disabled = true;
    els.replayButton.disabled = true;
    return;
  }
  els.resetButton.disabled = replayActive;
  els.replayButton.disabled = replayActive;
}

function setLoadState(state, text) {
  els.loadStatus.classList.toggle("is-ready", state === "ready");
  els.loadStatus.classList.toggle("is-error", state === "error");
  els.loadStatusText.textContent = text;
}

function showFatalError(error) {
  console.error(error);
  els.app.setAttribute("aria-busy", "false");
  setLoadState("error", "Load failed");
  setControlsDisabled(true);
  els.playBoard.classList.add("is-loading");
  els.playBoard.replaceChildren(createElement("span", "board-loading", error.message));
  els.auditBoard.classList.add("is-loading");
  els.auditBoard.replaceChildren(createElement("span", "board-loading", "Audit unavailable"));
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    els.toast.hidden = true;
  }, 1500);
}

function formatEvent(event) {
  switch (event.type) {
    case "PassengerCollected":
      return `Matched ${event.passengerId} · slot ${Number(event.slotIndex) + 1}`;
    case "HoleCompleted":
      return "Tray completed";
    case "HoleRemoved":
      return "Tray removed";
    case "ObjectiveEvaluated":
      return "Objective evaluated";
    case "WinOrFailCommitted":
      return String(event.outcome).toLowerCase() === "win" ? "Win committed" : "Result committed";
    default:
      return String(event.type).replace(/([a-z])([A-Z])/g, "$1 $2");
  }
}

function humanizeBlockedReason(reason) {
  const labels = {
    OutOfBoard: "The full tray must stay inside the grid.",
    InactiveMaskCell: "That grid cell is inactive.",
    OverlapsHole: "Another tray blocks that step.",
    OverlapsSolidObstacle: "A solid cell blocks that step.",
    PassengerMismatch: "Only matching patterns can enter this tray.",
    PassengerSlotAlreadyFilled: "That local slot is already filled.",
  };
  return labels[reason] ?? "That cell-by-cell move is blocked.";
}

function formatViolation(violation) {
  if (typeof violation === "string") return violation;
  return violation?.message ?? violation?.id ?? JSON.stringify(violation);
}

function normalizeSpreadReport(report, level) {
  const sourceColors = report.colors ?? Object.fromEntries(
    (report.perColor ?? []).map((metrics) => [metrics.colorId, metrics]),
  );
  const colors = Object.fromEntries(
    Object.entries(sourceColors).map(([colorId, metrics]) => [
      colorId,
      {
        passengerCount: metrics.passengerCount,
        minimumManhattanDistance: metrics.minimumManhattanDistance,
        occupiedRegionCount: metrics.occupiedRegionCount ?? metrics.regionsOccupied,
        maximumClusterSize: metrics.maximumClusterSize ?? metrics.largestCluster,
        maximumSameColorInAny2x2:
          metrics.maximumSameColorInAny2x2 ?? metrics.maximumInAny2x2,
      },
    ]),
  );
  const global = {
    occupiedRegionCount: report.global.occupiedRegionCount ?? report.global.occupiedRegions,
    maximumPassengersPerRegion:
      report.global.maximumPassengersPerRegion ?? report.global.maximumPerRegion,
    maximumPassengersInAny2x2:
      report.global.maximumPassengersInAny2x2 ?? report.global.maximumInAny2x2,
    maximumPassengersInAny3x3:
      report.global.maximumPassengersInAny3x3 ?? report.global.maximumInAny3x3,
  };
  const pass = report.pass ?? report.allPassed ?? false;
  return {
    levelId: report.levelId ?? level.id,
    passengerCount: report.passengerCount ?? level.passengers.length,
    holeCount: report.holeCount ?? level.holes.length,
    colors,
    global,
    constraints: report.constraints ?? level.generation.constraints,
    violations: report.violations ?? (pass ? [] : ["One or more spread constraints failed."]),
    pass,
  };
}

function eventSequence(event) {
  return Number(event.sequence ?? event.seq ?? 0);
}

function formatMetric(value) {
  return Number.isFinite(value) ? String(value) : "—";
}

function getColorMeta(colorId) {
  return COLOR_META[colorId] ?? { symbol: "◆", label: `${colorId} · symbol` };
}

function createElement(tagName, className = "", text = "") {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== "") element.textContent = text;
  return element;
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function cloneData(value) {
  return typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
}

function cssEscape(value) {
  return globalThis.CSS?.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
