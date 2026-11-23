export type GamePhase = 'title' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'arcade' | 'zen';

export type UpgradeId = 'blade' | 'engine' | 'heater' | 'steam' | 'magnet';

export type UpgradeLevels = Record<UpgradeId, number>;

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  shortRole: string;
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  keyHint: string;
  formatEffect: (level: number) => string;
}

export interface ComputedTruckStats {
  bladeHalfWidth: number;
  bladeReach: number;
  maxSpeed: number;
  accel: number;
  turnRate: number;
  heatLevel: number;
  steamCooldown: number;
  steamRadius: number;
  steamDuration: number;
  comboGraceSeconds: number;
  magnetRadius: number;
  loadCapacity: number;
  coinBonusMult: number;
}

export type CellKind = 'road' | 'obstacle' | 'grate';

export type SnowVariant = 'none' | 'powder' | 'deep' | 'ice' | 'golden';

export interface SnowCell {
  col: number;
  row: number;
  kind: CellKind;
  variant: SnowVariant;
  depth: number; // 0 (cleared) to 1.0 (full)
  maxDepth: number;
  baseValue: number;
}

export interface CottageBlueprint {
  id: string;
  name: string;
  x: number;
  z: number;
  rotY: number;
  doorCol: number;
  doorRow: number;
  colorHex: number;
  roofHex: number;
}

export interface CottageRuntime extends CottageBlueprint {
  rescued: boolean;
  rescueAnim: number; // 0..1
}

export interface GrateBlueprint {
  id: string;
  col: number;
  row: number;
}

export interface LanternBlueprint {
  x: number;
  z: number;
}

export interface DistrictDef {
  index: number;
  name: string;
  subtitle: string;
  gridCols: number;
  gridRows: number;
  cellSize: number;
  targetClearPct: number; // e.g., 85
  timeLimitSeconds: number;
  spawnX: number;
  spawnZ: number;
  spawnYaw: number;
  clocktowerPos: { x: number; z: number };
  cottages: CottageBlueprint[];
  grates: GrateBlueprint[];
  lanterns: LanternBlueprint[];
  icePatches: Array<{ col: number; row: number; radius: number }>;
  goldenDrifts: Array<{ col: number; row: number; radius: number }>;
  skyColor: number;
  fogColor: number;
}

export interface PickupState {
  id: number;
  kind: 'cocoa' | 'star';
  x: number;
  z: number;
  collected: boolean;
  bobOffset: number;
}

export interface ComboState {
  count: number;
  multiplier: number;
  timer: number;
  maxTimer: number;
  peakMultiplier: number;
}

export interface CalloutEvent {
  id: number;
  title: string;
  detail: string;
  tone: 'gold' | 'warm' | 'ice';
}

export interface HudSnapshot {
  phase: GamePhase;
  mode: GameMode;
  districtIndex: number;
  districtName: string;
  clearPct: number;
  targetClearPct: number;
  rescuedCottages: number;
  totalCottages: number;
  coins: number;
  score: number;
  bestScore: number;
  timeRemaining: number;
  comboMultiplier: number;
  comboCount: number;
  comboTimerRatio: number; // 0..1
  snowLoadRatio: number; // 0..1
  snowLoadAmount: number;
  steamChargeRatio: number; // 0..1
  steamReady: boolean;
  nearGrate: boolean;
  upgrades: UpgradeLevels;
  affordableUpgradeCount: number;
  garageOpen: boolean;
  muted: boolean;
  callout: CalloutEvent | null;
}

export interface RunSummary {
  outcome: 'victory' | 'dusk';
  districtIndex: number;
  districtName: string;
  clearPct: number;
  targetClearPct: number;
  rescuedCottages: number;
  totalCottages: number;
  peakCombo: number;
  coinsEarnedThisShift: number;
  totalCoins: number;
  score: number;
  bestScore: number;
  timeElapsed: number;
}
