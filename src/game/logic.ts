import type {
  ComboState,
  ComputedTruckStats,
  CottageRuntime,
  DistrictDef,
  SnowCell,
  SnowVariant,
  UpgradeDef,
  UpgradeId,
  UpgradeLevels,
} from './types';

export const DEFAULT_UPGRADES: UpgradeLevels = {
  blade: 1,
  engine: 1,
  heater: 1,
  steam: 1,
  magnet: 1,
};

export const UPGRADE_DEFS: UpgradeDef[] = [
  {
    id: 'blade',
    name: 'Brass V-Blade',
    shortRole: 'Wider sweep & bigger snow load capacity',
    maxLevel: 5,
    baseCost: 45,
    costMultiplier: 1.75,
    keyHint: '1',
    formatEffect: (lv) => `${(1.25 + (lv - 1) * 0.24).toFixed(2)}m sweep · ${14 + (lv - 1) * 5} load`,
  },
  {
    id: 'engine',
    name: 'Alpine Turbo',
    shortRole: 'Faster top speed & nimble snow-drift grip',
    maxLevel: 5,
    baseCost: 50,
    costMultiplier: 1.75,
    keyHint: '2',
    formatEffect: (lv) => `${Math.round((8.4 + (lv - 1) * 1.15) * 10) / 10} m/s drive`,
  },
  {
    id: 'heater',
    name: 'Hearth Coils',
    shortRole: 'Glows hot to shatter blue ice & boost melt value',
    maxLevel: 5,
    baseCost: 65,
    costMultiplier: 1.8,
    keyHint: '3',
    formatEffect: (lv) => (lv === 1 ? 'Standard steel edge' : `Ice-melt Lv.${lv} · +${(lv - 1) * 20}% melt`),
  },
  {
    id: 'steam',
    name: 'Steam Boiler',
    shortRole: 'Faster Spacebar surge with wider blast radius',
    maxLevel: 5,
    baseCost: 55,
    costMultiplier: 1.75,
    keyHint: '4',
    formatEffect: (lv) => `${(3.2 + (lv - 1) * 0.55).toFixed(1)}m blast · ${(5.0 - (lv - 1) * 0.65).toFixed(1)}s cd`,
  },
  {
    id: 'magnet',
    name: 'Chime & Magnet',
    shortRole: 'Longer combo grace window & pickup pull',
    maxLevel: 5,
    baseCost: 40,
    costMultiplier: 1.7,
    keyHint: '5',
    formatEffect: (lv) => `${(3.6 + (lv - 1) * 0.65).toFixed(1)}s combo · +${(lv - 1) * 15}% coins`,
  },
];

export function getUpgradeCost(id: UpgradeId, currentLevel: number): number {
  const def = UPGRADE_DEFS.find((u) => u.id === id);
  if (!def || currentLevel >= def.maxLevel) return Infinity;
  return Math.round(def.baseCost * Math.pow(def.costMultiplier, currentLevel - 1) / 5) * 5;
}

export function canAffordUpgrade(id: UpgradeId, levels: UpgradeLevels, coins: number): boolean {
  const cost = getUpgradeCost(id, levels[id]);
  return Number.isFinite(cost) && coins >= cost;
}

export function countAffordableUpgrades(levels: UpgradeLevels, coins: number): number {
  let count = 0;
  for (const def of UPGRADE_DEFS) {
    if (canAffordUpgrade(def.id, levels, coins)) count++;
  }
  return count;
}

export function purchaseUpgrade(
  id: UpgradeId,
  levels: UpgradeLevels,
  coins: number,
): { purchased: boolean; nextLevels: UpgradeLevels; nextCoins: number; cost: number } {
  const cost = getUpgradeCost(id, levels[id]);
  if (!Number.isFinite(cost) || coins < cost) {
    return { purchased: false, nextLevels: levels, nextCoins: coins, cost };
  }
  return {
    purchased: true,
    nextLevels: { ...levels, [id]: levels[id] + 1 },
    nextCoins: coins - cost,
    cost,
  };
}

export function computeTruckStats(levels: UpgradeLevels): ComputedTruckStats {
  return {
    bladeHalfWidth: 1.12 + (levels.blade - 1) * 0.24,
    bladeReach: 1.35 + (levels.blade - 1) * 0.1,
    maxSpeed: 8.4 + (levels.engine - 1) * 1.15,
    accel: 24 + (levels.engine - 1) * 3.5,
    turnRate: 9.2 + (levels.engine - 1) * 0.9,
    heatLevel: levels.heater,
    steamCooldown: Math.max(2.2, 5.0 - (levels.steam - 1) * 0.65),
    steamRadius: 3.2 + (levels.steam - 1) * 0.55,
    steamDuration: 0.42 + (levels.steam - 1) * 0.05,
    comboGraceSeconds: 3.6 + (levels.magnet - 1) * 0.65,
    magnetRadius: 2.8 + (levels.magnet - 1) * 0.75,
    loadCapacity: 14 + (levels.blade - 1) * 5,
    coinBonusMult: 1 + (levels.magnet - 1) * 0.15 + (levels.heater - 1) * 0.1,
  };
}

export const DISTRICTS: DistrictDef[] = [
  {
    index: 0,
    name: 'Pinebrook Square',
    subtitle: 'Clear the cobbled village square and warm all 3 cottages',
    gridCols: 22,
    gridRows: 22,
    cellSize: 1.15,
    targetClearPct: 82,
    timeLimitSeconds: 95,
    spawnX: 0,
    spawnZ: 4.5,
    spawnYaw: Math.PI, // Facing north into the square & clocktower vista
    clocktowerPos: { x: 0, z: -13.4 },
    cottages: [
      { id: 'c1', name: 'Baker Hearth', x: -13.6, z: -4.2, rotY: Math.PI / 2, doorCol: 1, doorRow: 7, colorHex: 0xe6d5bc, roofHex: 0x8f3a2e },
      { id: 'c2', name: 'Tailor Loft', x: 13.6, z: -4.2, rotY: -Math.PI / 2, doorCol: 20, doorRow: 7, colorHex: 0xd9cbb8, roofHex: 0x355c54 },
      { id: 'c3', name: 'Candle Shop', x: -13.6, z: 5.5, rotY: Math.PI / 2, doorCol: 1, doorRow: 15, colorHex: 0xead8c0, roofHex: 0x5c4138 },
    ],
    grates: [
      { id: 'g1', col: 11, row: 11 },
      { id: 'g2', col: 5, row: 6 },
    ],
    lanterns: [
      { x: -11.5, z: -11.2 },
      { x: 11.5, z: -11.2 },
      { x: -11.5, z: 11.2 },
      { x: 11.5, z: 11.2 },
      { x: -4.2, z: -11.6 },
      { x: 4.2, z: -11.6 },
    ],
    icePatches: [
      { col: 15, row: 6, radius: 2.0 },
      { col: 7, row: 15, radius: 1.8 },
    ],
    goldenDrifts: [
      { col: 11, row: 4, radius: 1.8 },
      { col: 17, row: 15, radius: 1.7 },
    ],
    skyColor: 0x1e3046,
    fogColor: 0x263b52,
  },
  {
    index: 1,
    name: 'Lantern Terrace',
    subtitle: 'Heavier alpine drifts and crystalline frost lanes',
    gridCols: 24,
    gridRows: 24,
    cellSize: 1.15,
    targetClearPct: 84,
    timeLimitSeconds: 105,
    spawnX: 0,
    spawnZ: 6.2,
    spawnYaw: Math.PI,
    clocktowerPos: { x: 0, z: -14.8 },
    cottages: [
      { id: 'c1', name: 'Clockmaker', x: -15.0, z: -5.8, rotY: Math.PI / 2, doorCol: 1, doorRow: 6, colorHex: 0xead7bd, roofHex: 0x8f3a2e },
      { id: 'c2', name: 'Tea Parlor', x: 15.0, z: -5.8, rotY: -Math.PI / 2, doorCol: 22, doorRow: 6, colorHex: 0xd8cdb9, roofHex: 0x3b5f63 },
      { id: 'c3', name: 'Woodcarver', x: -15.0, z: 5.4, rotY: Math.PI / 2, doorCol: 1, doorRow: 16, colorHex: 0xe3cfb2, roofHex: 0x6b4531 },
      { id: 'c4', name: 'Innkeeper', x: 15.0, z: 5.4, rotY: -Math.PI / 2, doorCol: 22, doorRow: 16, colorHex: 0xe9dec9, roofHex: 0x8c3f34 },
    ],
    grates: [
      { id: 'g1', col: 8, row: 10 },
      { id: 'g2', col: 16, row: 14 },
      { id: 'g3', col: 12, row: 5 },
    ],
    lanterns: [
      { x: -12.8, z: -12.4 },
      { x: 12.8, z: -12.4 },
      { x: -12.8, z: 12.4 },
      { x: 12.8, z: 12.4 },
      { x: -4.5, z: -12.8 },
      { x: 4.5, z: -12.8 },
    ],
    icePatches: [
      { col: 12, row: 12, radius: 2.3 },
      { col: 6, row: 6, radius: 2.0 },
      { col: 18, row: 7, radius: 2.0 },
    ],
    goldenDrifts: [
      { col: 12, row: 3, radius: 2.0 },
      { col: 5, row: 18, radius: 1.9 },
      { col: 19, row: 18, radius: 1.9 },
    ],
    skyColor: 0x1a2840,
    fogColor: 0x22354f,
  },
  {
    index: 2,
    name: 'Summit Chalet',
    subtitle: 'High-altitude snowbank blitz under twilight stars',
    gridCols: 26,
    gridRows: 26,
    cellSize: 1.15,
    targetClearPct: 86,
    timeLimitSeconds: 115,
    spawnX: 0,
    spawnZ: 7.4,
    spawnYaw: Math.PI,
    clocktowerPos: { x: 0, z: -16.2 },
    cottages: [
      { id: 'c1', name: 'Observatory', x: -16.2, z: -7.2, rotY: Math.PI / 2, doorCol: 1, doorRow: 6, colorHex: 0xe7d6bd, roofHex: 0x344e69 },
      { id: 'c2', name: 'Alpine Lodge', x: 16.2, z: -7.2, rotY: -Math.PI / 2, doorCol: 24, doorRow: 6, colorHex: 0xebd9be, roofHex: 0x8e382e },
      { id: 'c3', name: 'Forge & Mill', x: -16.2, z: 5.8, rotY: Math.PI / 2, doorCol: 1, doorRow: 18, colorHex: 0xd9cbb6, roofHex: 0x5c4237 },
      { id: 'c4', name: 'Starlight Inn', x: 16.2, z: 5.8, rotY: -Math.PI / 2, doorCol: 24, doorRow: 18, colorHex: 0xeae0cd, roofHex: 0x355c54 },
    ],
    grates: [
      { id: 'g1', col: 13, row: 13 },
      { id: 'g2', col: 6, row: 7 },
      { id: 'g3', col: 20, row: 7 },
      { id: 'g4', col: 13, row: 20 },
    ],
    lanterns: [
      { x: -14.0, z: -13.6 },
      { x: 14.0, z: -13.6 },
      { x: -14.0, z: 13.6 },
      { x: 14.0, z: 13.6 },
      { x: -5.0, z: -14.0 },
      { x: 5.0, z: -14.0 },
    ],
    icePatches: [
      { col: 10, row: 10, radius: 2.3 },
      { col: 16, row: 10, radius: 2.3 },
      { col: 13, row: 17, radius: 2.4 },
      { col: 6, row: 15, radius: 2.0 },
    ],
    goldenDrifts: [
      { col: 13, row: 4, radius: 2.2 },
      { col: 20, row: 18, radius: 2.1 },
      { col: 6, row: 20, radius: 2.1 },
    ],
    skyColor: 0x162238,
    fogColor: 0x1f2f49,
  },
];

export function getDistrictDef(districtIndex: number): DistrictDef {
  const base = DISTRICTS[districtIndex % DISTRICTS.length];
  const loop = Math.floor(districtIndex / DISTRICTS.length);
  if (loop === 0) return base;
  return {
    ...base,
    index: districtIndex,
    name: `${base.name} · Winter ${loop + 1}`,
    targetClearPct: Math.min(92, base.targetClearPct + loop * 2),
    timeLimitSeconds: Math.max(75, base.timeLimitSeconds - loop * 6),
  };
}

export function gridToWorld(
  col: number,
  row: number,
  district: Pick<DistrictDef, 'gridCols' | 'gridRows' | 'cellSize'>,
): { x: number; z: number } {
  const halfW = (district.gridCols * district.cellSize) / 2;
  const halfH = (district.gridRows * district.cellSize) / 2;
  return {
    x: -halfW + (col + 0.5) * district.cellSize,
    z: -halfH + (row + 0.5) * district.cellSize,
  };
}

export function worldToGrid(
  x: number,
  z: number,
  district: Pick<DistrictDef, 'gridCols' | 'gridRows' | 'cellSize'>,
): { col: number; row: number } {
  const halfW = (district.gridCols * district.cellSize) / 2;
  const halfH = (district.gridRows * district.cellSize) / 2;
  return {
    col: Math.floor((x + halfW) / district.cellSize),
    row: Math.floor((z + halfH) / district.cellSize),
  };
}

/** Deterministic pseudo-random helper for reproducible snow relief */
function hash2d(col: number, row: number, seed: number): number {
  const n = Math.sin(col * 127.1 + row * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

export function createDistrictGrid(district: DistrictDef): SnowCell[] {
  const cells: SnowCell[] = [];
  const spawnGrid = worldToGrid(district.spawnX, district.spawnZ, district);

  for (let row = 0; row < district.gridRows; row++) {
    for (let col = 0; col < district.gridCols; col++) {
      const isGrate = district.grates.some((g) => g.col === col && g.row === row);
      if (isGrate) {
        cells.push({
          col,
          row,
          kind: 'grate',
          variant: 'none',
          depth: 0,
          maxDepth: 0,
          baseValue: 0,
        });
        continue;
      }

      // Clear a cozy 3x3 starting pad around the plow truck so the opening vista feels grounded
      const distToSpawn = Math.hypot(col - spawnGrid.col, row - spawnGrid.row);
      if (distToSpawn <= 1.6) {
        cells.push({
          col,
          row,
          kind: 'road',
          variant: 'none',
          depth: 0,
          maxDepth: 1,
          baseValue: 2,
        });
        continue;
      }

      // Check golden drifts first, then ice patches, then deep vs powder snow
      let variant: SnowVariant = 'powder';
      let maxDepth = 0.72 + hash2d(col, row, district.index + 1) * 0.28;
      let baseValue = 2;

      const inGolden = district.goldenDrifts.some(
        (g) => Math.hypot(col - g.col, row - g.row) <= g.radius,
      );
      const inIce = district.icePatches.some(
        (p) => Math.hypot(col - p.col, row - p.row) <= p.radius,
      );

      if (inGolden) {
        variant = 'golden';
        maxDepth = 1.0;
        baseValue = 6;
      } else if (inIce) {
        variant = 'ice';
        maxDepth = 1.0;
        baseValue = 5;
      } else {
        // Mound deeper snow near cottage doorways & courtyard edges
        const nearDoor = district.cottages.some(
          (c) => Math.hypot(col - c.doorCol, row - c.doorRow) <= 2.4,
        );
        const h = hash2d(col, row, district.index + 13);
        if (nearDoor || h > 0.62) {
          variant = 'deep';
          maxDepth = 0.92 + h * 0.08;
          baseValue = 3;
        }
      }

      cells.push({
        col,
        row,
        kind: 'road',
        variant,
        depth: maxDepth,
        maxDepth,
        baseValue,
      });
    }
  }
  return cells;
}

export function computeClearStats(cells: SnowCell[]): {
  totalSnowCells: number;
  clearedCells: number;
  clearPct: number;
} {
  let totalSnowCells = 0;
  let clearedCells = 0;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.kind !== 'road' || c.maxDepth <= 0) continue;
    totalSnowCells++;
    if (c.depth <= 0.05) clearedCells++;
  }
  const clearPct = totalSnowCells === 0 ? 100 : (clearedCells / totalSnowCells) * 100;
  return { totalSnowCells, clearedCells, clearPct };
}

export function createInitialCombo(graceSeconds: number): ComboState {
  return {
    count: 0,
    multiplier: 1,
    timer: 0,
    maxTimer: graceSeconds,
    peakMultiplier: 1,
  };
}

export function computeComboMultiplier(comboCount: number): number {
  if (comboCount < 4) return 1;
  if (comboCount < 10) return 2;
  if (comboCount < 18) return 3;
  if (comboCount < 28) return 4;
  if (comboCount < 40) return 5;
  if (comboCount < 55) return 6;
  if (comboCount < 72) return 8;
  if (comboCount < 92) return 10;
  return 12;
}

export function advanceCombo(combo: ComboState, tilesCleared: number, graceSeconds: number): ComboState {
  if (tilesCleared <= 0) return combo;
  const nextCount = combo.count + tilesCleared;
  const nextMult = computeComboMultiplier(nextCount);
  return {
    count: nextCount,
    multiplier: nextMult,
    timer: graceSeconds,
    maxTimer: graceSeconds,
    peakMultiplier: Math.max(combo.peakMultiplier, nextMult),
  };
}

export function tickCombo(combo: ComboState, dt: number): ComboState {
  if (combo.count === 0) return combo;
  const nextTimer = combo.timer - dt;
  if (nextTimer <= 0) {
    return {
      ...combo,
      count: 0,
      multiplier: 1,
      timer: 0,
    };
  }
  return {
    ...combo,
    timer: nextTimer,
  };
}

export interface ClearFootprintResult {
  clearedCount: number;
  iceShatteredCount: number;
  iceBlockedCount: number;
  goldenCount: number;
  snowVolumeGained: number;
  coinsAwarded: number;
  scoreAwarded: number;
  clearedIndices: number[];
}

export function clearSnowInFootprint(
  cells: SnowCell[],
  district: DistrictDef,
  bladeWorldX: number,
  bladeWorldZ: number,
  radius: number,
  options: {
    heatLevel: number;
    steamActive: boolean;
    comboMultiplier: number;
    coinBonusMult: number;
  },
): ClearFootprintResult {
  const result: ClearFootprintResult = {
    clearedCount: 0,
    iceShatteredCount: 0,
    iceBlockedCount: 0,
    goldenCount: 0,
    snowVolumeGained: 0,
    coinsAwarded: 0,
    scoreAwarded: 0,
    clearedIndices: [],
  };

  const center = worldToGrid(bladeWorldX, bladeWorldZ, district);
  const cellSpan = Math.ceil(radius / district.cellSize) + 1;

  const minRow = Math.max(0, center.row - cellSpan);
  const maxRow = Math.min(district.gridRows - 1, center.row + cellSpan);
  const minCol = Math.max(0, center.col - cellSpan);
  const maxCol = Math.min(district.gridCols - 1, center.col + cellSpan);

  const canBreakIce = options.steamActive || options.heatLevel >= 2;

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const idx = row * district.gridCols + col;
      const cell = cells[idx];
      if (!cell || cell.kind !== 'road' || cell.depth <= 0.05) continue;

      const pos = gridToWorld(col, row, district);
      const dist = Math.hypot(pos.x - bladeWorldX, pos.z - bladeWorldZ);
      if (dist > radius) continue;

      if (cell.variant === 'ice' && !canBreakIce) {
        result.iceBlockedCount++;
        continue;
      }

      const clearedDepth = cell.depth;
      cell.depth = 0;
      const prevVariant = cell.variant;
      cell.variant = 'none';

      result.clearedCount++;
      result.clearedIndices.push(idx);
      result.snowVolumeGained += clearedDepth;

      if (prevVariant === 'ice') result.iceShatteredCount++;
      if (prevVariant === 'golden') result.goldenCount++;

      const tileCoins = Math.max(
        1,
        Math.round(cell.baseValue * (1 + (options.comboMultiplier - 1) * 0.25) * options.coinBonusMult),
      );
      result.coinsAwarded += tileCoins;
      result.scoreAwarded += cell.baseValue * 15 * options.comboMultiplier;
    }
  }

  return result;
}

export function calculateMeltPayout(
  snowLoad: number,
  comboMultiplier: number,
  heatLevel: number,
  coinBonusMult: number,
): { coins: number; score: number } {
  if (snowLoad < 2.5) return { coins: 0, score: 0 };
  const heatFactor = 1 + (heatLevel - 1) * 0.2;
  const coins = Math.round(snowLoad * 2.6 * (1 + (comboMultiplier - 1) * 0.35) * heatFactor * coinBonusMult);
  const score = Math.round(snowLoad * 85 * comboMultiplier * heatFactor);
  return { coins, score };
}

/**
 * Checks whether any unrescued cottage's doorway zone (radius 2.2 cells around doorCol/doorRow)
 * is at least 75% cleared, rescuing the cottage and returning newly rescued IDs.
 */
export function checkCottageRescues(
  cells: SnowCell[],
  district: DistrictDef,
  cottages: CottageRuntime[],
): CottageRuntime[] {
  const newlyRescued: CottageRuntime[] = [];

  for (const cottage of cottages) {
    if (cottage.rescued) continue;
    let total = 0;
    let cleared = 0;
    for (let r = cottage.doorRow - 2; r <= cottage.doorRow + 2; r++) {
      for (let c = cottage.doorCol - 2; c <= cottage.doorCol + 2; c++) {
        if (r < 0 || r >= district.gridRows || c < 0 || c >= district.gridCols) continue;
        if (Math.hypot(c - cottage.doorCol, r - cottage.doorRow) > 2.25) continue;
        const cell = cells[r * district.gridCols + c];
        if (!cell || cell.kind !== 'road' || cell.maxDepth <= 0) continue;
        total++;
        if (cell.depth <= 0.05) cleared++;
      }
    }
    if (total > 0 && cleared / total >= 0.75) {
      cottage.rescued = true;
      newlyRescued.push(cottage);
    }
  }

  return newlyRescued;
}

export function evaluateShiftOutcome(params: {
  clearPct: number;
  targetClearPct: number;
  rescuedCottages: number;
  totalCottages: number;
  timeRemaining: number;
  mode: 'arcade' | 'zen';
}): 'ongoing' | 'victory' | 'dusk' {
  if (params.clearPct >= params.targetClearPct && params.rescuedCottages >= params.totalCottages) {
    return 'victory';
  }
  if (params.mode === 'arcade' && params.timeRemaining <= 0) {
    return 'dusk';
  }
  return 'ongoing';
}
