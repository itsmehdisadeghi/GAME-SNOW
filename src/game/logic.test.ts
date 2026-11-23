import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_UPGRADES,
  advanceCombo,
  calculateMeltPayout,
  canAffordUpgrade,
  checkCottageRescues,
  clearSnowInFootprint,
  computeClearStats,
  computeTruckStats,
  createDistrictGrid,
  createInitialCombo,
  evaluateShiftOutcome,
  getDistrictDef,
  getUpgradeCost,
  gridToWorld,
  purchaseUpgrade,
  tickCombo,
} from './logic';
import type { CottageRuntime } from './types';

test('district grid generates snow, grates, ice, and clear spawn pad', () => {
  const district = getDistrictDef(0);
  const cells = createDistrictGrid(district);
  assert.equal(cells.length, district.gridCols * district.gridRows);

  const grateCells = cells.filter((c) => c.kind === 'grate');
  assert.equal(grateCells.length, district.grates.length);

  const iceCells = cells.filter((c) => c.variant === 'ice');
  assert.ok(iceCells.length > 0, 'Expected ice patch cells in District 0');

  const goldenCells = cells.filter((c) => c.variant === 'golden');
  assert.ok(goldenCells.length > 0, 'Expected golden drift cells in District 0');

  const stats = computeClearStats(cells);
  assert.ok(stats.clearPct > 0 && stats.clearPct < 15, 'Spawn pad cleared should be small initial %');
});

test('plowing footprint clears snow, blocks ice without heater/steam, and shatters ice with steam or heater', () => {
  const district = getDistrictDef(0);
  const cells = createDistrictGrid(district);
  const icePatch = district.icePatches[0];
  const icePos = gridToWorld(icePatch.col, icePatch.row, district);

  // Without heater Lv2+ and without steam, ice is blocked
  const blockedRes = clearSnowInFootprint(cells, district, icePos.x, icePos.z, 1.3, {
    heatLevel: 1,
    steamActive: false,
    comboMultiplier: 1,
    coinBonusMult: 1,
  });
  assert.ok(blockedRes.iceBlockedCount > 0);
  assert.equal(blockedRes.iceShatteredCount, 0);

  // With steam active, ice shatters cleanly
  const shatterRes = clearSnowInFootprint(cells, district, icePos.x, icePos.z, 1.3, {
    heatLevel: 1,
    steamActive: true,
    comboMultiplier: 3,
    coinBonusMult: 1,
  });
  assert.ok(shatterRes.iceShatteredCount > 0);
  assert.ok(shatterRes.coinsAwarded > 0);
  assert.ok(shatterRes.scoreAwarded > 0);
});

test('combo multiplier escalates with cleared tiles and decays cleanly to x1', () => {
  let combo = createInitialCombo(3.6);
  combo = advanceCombo(combo, 5, 3.6);
  assert.equal(combo.multiplier, 2);
  assert.equal(combo.peakMultiplier, 2);

  combo = advanceCombo(combo, 25, 3.6);
  assert.equal(combo.multiplier, 5);
  assert.equal(combo.peakMultiplier, 5);

  combo = tickCombo(combo, 2.0);
  assert.equal(combo.multiplier, 5);
  assert.ok(combo.timer > 1.5);

  combo = tickCombo(combo, 2.5);
  assert.equal(combo.count, 0);
  assert.equal(combo.multiplier, 1);
  assert.equal(combo.peakMultiplier, 5);
});

test('thermal grate melt payout scales with load, combo, and heater level', () => {
  const tiny = calculateMeltPayout(1.5, 2, 1, 1);
  assert.equal(tiny.coins, 0);

  const base = calculateMeltPayout(12, 1, 1, 1);
  const comboBoosted = calculateMeltPayout(12, 4, 3, 1.3);
  assert.ok(base.coins > 20);
  assert.ok(comboBoosted.coins > base.coins * 2);
  assert.ok(comboBoosted.score > base.score * 4);
});

test('cottage rescue triggers when doorway snow is 75%+ cleared', () => {
  const district = getDistrictDef(0);
  const cells = createDistrictGrid(district);
  const cottages: CottageRuntime[] = district.cottages.map((c) => ({
    ...c,
    rescued: false,
    rescueAnim: 0,
  }));

  assert.equal(checkCottageRescues(cells, district, cottages).length, 0);

  const target = cottages[0];
  const doorPos = gridToWorld(target.doorCol, target.doorRow, district);
  clearSnowInFootprint(cells, district, doorPos.x, doorPos.z, 3.2, {
    heatLevel: 3,
    steamActive: true,
    comboMultiplier: 2,
    coinBonusMult: 1,
  });

  const rescued = checkCottageRescues(cells, district, cottages);
  assert.equal(rescued.length, 1);
  assert.equal(rescued[0].id, target.id);
  assert.equal(cottages[0].rescued, true);
});

test('upgrade purchase deducts coins, increments level, and scales truck stats', () => {
  const baseStats = computeTruckStats(DEFAULT_UPGRADES);
  const cost = getUpgradeCost('blade', 1);
  assert.equal(canAffordUpgrade('blade', DEFAULT_UPGRADES, cost - 1), false);
  assert.equal(canAffordUpgrade('blade', DEFAULT_UPGRADES, cost), true);

  const res = purchaseUpgrade('blade', DEFAULT_UPGRADES, cost + 20);
  assert.equal(res.purchased, true);
  assert.equal(res.nextLevels.blade, 2);
  assert.equal(res.nextCoins, 20);

  const upgradedStats = computeTruckStats(res.nextLevels);
  assert.ok(upgradedStats.bladeHalfWidth > baseStats.bladeHalfWidth);
  assert.ok(upgradedStats.loadCapacity > baseStats.loadCapacity);
});

test('shift outcome distinguishes ongoing, victory, and dusk expiry', () => {
  assert.equal(
    evaluateShiftOutcome({
      clearPct: 80,
      targetClearPct: 82,
      rescuedCottages: 3,
      totalCottages: 3,
      timeRemaining: 20,
      mode: 'arcade',
    }),
    'ongoing',
  );

  assert.equal(
    evaluateShiftOutcome({
      clearPct: 84,
      targetClearPct: 82,
      rescuedCottages: 3,
      totalCottages: 3,
      timeRemaining: 12,
      mode: 'arcade',
    }),
    'victory',
  );

  assert.equal(
    evaluateShiftOutcome({
      clearPct: 60,
      targetClearPct: 82,
      rescuedCottages: 2,
      totalCottages: 3,
      timeRemaining: 0,
      mode: 'arcade',
    }),
    'dusk',
  );

  // Zen mode never triggers dusk failure when timer hits 0
  assert.equal(
    evaluateShiftOutcome({
      clearPct: 60,
      targetClearPct: 82,
      rescuedCottages: 2,
      totalCottages: 3,
      timeRemaining: 0,
      mode: 'zen',
    }),
    'ongoing',
  );
});
