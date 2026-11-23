import React from 'react';
import type { HudSnapshot } from '../game/types';
import {
  CoinIcon,
  CottagePipIcon,
  PauseIcon,
  RestartIcon,
  SoundIcon,
  SteamIcon,
  WrenchIcon,
} from './HudIcons';

interface GameHudProps {
  hud: HudSnapshot;
  onOpenGarage: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onSteamBoost: () => void;
  onVirtualMove: (x: number, y: number) => void;
}

export function GameHud({
  hud,
  onOpenGarage,
  onToggleMute,
  onTogglePause,
  onRestart,
  onSteamBoost,
  onVirtualMove,
}: GameHudProps) {
  const clearProgress = Math.min(100, (hud.clearPct / Math.max(1, hud.targetClearPct)) * 100);
  const lowTime = hud.mode === 'arcade' && hud.timeRemaining <= 15;
  const loadReadyToBank = hud.snowLoadRatio >= 0.45;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.max(0, sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5">
      {/* Top Perimeter Cluster */}
      <div className="relative flex items-start justify-between gap-2 sm:gap-3">
        {/* Top-Left: District Progress, Cottages & Timer */}
        <div
          className="rounded-lg border border-[#e6b04e]/35 px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-[0_6px_18px_rgba(9,15,24,0.45)] w-[178px] sm:w-[248px] shrink-0"
          style={{ backgroundColor: 'rgba(20, 32, 47, 0.92)' }}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-sm sm:text-base font-bold text-[#fbf4e7] leading-tight truncate">
              {hud.districtName}
            </span>
            {hud.mode === 'arcade' ? (
              <span
                className={`font-mono-num text-xs sm:text-sm font-bold shrink-0 ${
                  lowTime ? 'text-[#ff7b6b]' : 'text-[#f2c478]'
                }`}
              >
                {formatTime(hud.timeRemaining)}
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-[#9ec5e6] shrink-0">Zen</span>
            )}
          </div>

          {/* Snow cleared bar */}
          <div className="mt-1.5 sm:mt-2">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-[#c5d6e8] mb-1">
              <span>SNOW</span>
              <span className="font-mono-num text-[#fbf4e7]">
                {hud.clearPct}% / {hud.targetClearPct}%
              </span>
            </div>
            <div className="h-2 w-full rounded-sm bg-[#0f1a27] overflow-hidden border border-[#3a526c]/60">
              <div
                className="h-full bg-[#e8b14e] transition-transform duration-150 origin-left"
                style={{ transform: `scaleX(${clearProgress / 100})` }}
              />
            </div>
          </div>

          {/* Cottages warmth socket pips */}
          <div className="mt-1.5 sm:mt-2 flex items-center justify-between gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-semibold text-[#c5d6e8]">CABINS</span>
            <div
              className="flex items-center gap-1"
              aria-label={`${hud.rescuedCottages} of ${hud.totalCottages} cottages warmed`}
            >
              {Array.from({ length: hud.totalCottages }).map((_, idx) => (
                <CottagePipIcon key={idx} rescued={idx < hud.rescuedCottages} />
              ))}
              <span className="font-mono-num text-xs font-bold text-[#fbf4e7] ml-0.5">
                {hud.rescuedCottages}/{hud.totalCottages}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right: Coins, Score & Utility Buttons */}
        <div className="flex flex-col items-end gap-1.5 sm:gap-2 shrink-0">
          <div
            className="rounded-lg border border-[#e6b04e]/35 px-2.5 py-1.5 sm:px-3.5 sm:py-2 shadow-[0_6px_18px_rgba(9,15,24,0.45)] flex items-center gap-2.5 sm:gap-4"
            style={{ backgroundColor: 'rgba(20, 32, 47, 0.92)' }}
          >
            <div className="flex items-center gap-1.5">
              <CoinIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              <div>
                <div className="text-[9px] sm:text-[10px] font-semibold text-[#c5d6e8] leading-none">
                  COINS
                </div>
                <div
                  className="font-mono-num text-sm sm:text-lg font-bold text-[#ffd670] leading-tight"
                  data-testid="hud-coins"
                >
                  {hud.coins}
                </div>
              </div>
            </div>
            <div className="w-px h-6 sm:h-7 bg-[#3c5470]" aria-hidden="true" />
            <div>
              <div className="text-[9px] sm:text-[10px] font-semibold text-[#c5d6e8] leading-none">
                SCORE
              </div>
              <div
                className="font-mono-num text-sm sm:text-lg font-bold text-[#fbf4e7] leading-tight"
                data-testid="hud-score"
              >
                {hud.score.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenGarage();
              }}
              aria-label="Open Garage Upgrades"
              className={`h-8 sm:h-9 px-2 sm:px-3 rounded-md border text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                hud.affordableUpgradeCount > 0
                  ? 'bg-[#d44634] border-[#f2c478] text-[#fdf7ee] hover:bg-[#e35340]'
                  : 'bg-[#1a2a3d] border-[#435d7a] text-[#e8eff7] hover:bg-[#243852]'
              }`}
            >
              <WrenchIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Garage [U]</span>
              <span className="sm:hidden">Shop</span>
              {hud.affordableUpgradeCount > 0 && (
                <span className="font-mono-num text-[#ffd97a]">({hud.affordableUpgradeCount})</span>
              )}
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={hud.muted ? 'Unmute Audio' : 'Mute Audio'}
              title="Mute [M]"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#1a2a3d] hover:bg-[#243852] border border-[#435d7a] flex items-center justify-center cursor-pointer shrink-0"
            >
              <SoundIcon muted={hud.muted} />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              aria-label="Pause Game"
              title="Pause [P]"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#1a2a3d] hover:bg-[#243852] border border-[#435d7a] flex items-center justify-center cursor-pointer shrink-0"
            >
              <PauseIcon />
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              aria-label="Restart District"
              title="Restart [R]"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-[#1a2a3d] hover:bg-[#243852] border border-[#435d7a] flex items-center justify-center cursor-pointer shrink-0"
            >
              <RestartIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Centered Flow Combo & Callout Banner (floats below top row on mobile, centered top on desktop) */}
      {(hud.comboMultiplier >= 2 || hud.callout) && (
        <div className="fixed left-1/2 -translate-x-1/2 top-[112px] sm:top-5 z-10 pointer-events-none flex flex-col items-center gap-1.5 max-w-[260px] sm:max-w-sm">
          {hud.comboMultiplier >= 2 && (
            <div
              className="rounded-lg border-2 border-[#f2c478] px-3.5 py-1 sm:px-4 sm:py-1.5 shadow-[0_6px_20px_rgba(9,15,24,0.5)] flex flex-col items-center min-w-[116px] sm:min-w-[132px]"
              style={{ backgroundColor: 'rgba(25, 38, 54, 0.94)' }}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono-num text-xl sm:text-3xl font-bold text-[#ffd56b] leading-none">
                  ×{hud.comboMultiplier}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-[#f5efe4]">
                  FLOW
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-sm bg-[#0f1a27] overflow-hidden">
                <div
                  className="h-full bg-[#ff9b3d] origin-left"
                  style={{ transform: `scaleX(${hud.comboTimerRatio})` }}
                />
              </div>
            </div>
          )}

          {hud.callout && (
            <div
              key={hud.callout.id}
              className="rounded-lg border px-3 py-1.5 text-center shadow-[0_4px_14px_rgba(9,15,24,0.55)]"
              style={{
                backgroundColor: 'rgba(18, 29, 43, 0.94)',
                borderColor:
                  hud.callout.tone === 'gold'
                    ? '#f2c478'
                    : hud.callout.tone === 'ice'
                      ? '#7ad4f5'
                      : '#f29f58',
              }}
            >
              <div className="font-display text-xs sm:text-sm font-bold text-[#fbf5ea] leading-tight">
                {hud.callout.title}
              </div>
              <div className="text-[10px] sm:text-[11px] font-medium text-[#d4e2f0] leading-tight mt-0.5">
                {hud.callout.detail}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottom Perimeter Row: Compact Plow Gauges + Clean Mobile Touch Controls */}
      <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:items-end sm:justify-center">
        {/* Touch D-Pad (compact touch widths < md, full 44px tap targets) */}
        <div className="md:hidden w-full flex items-end justify-between px-1 pointer-events-none">
          <div className="pointer-events-auto grid grid-cols-3 gap-1 w-[136px] shrink-0">
            <div />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Drive Up"
              onPointerDown={() => onVirtualMove(0, 1)}
              onPointerUp={() => onVirtualMove(0, 0)}
              onPointerLeave={() => onVirtualMove(0, 0)}
              className="w-11 h-11 rounded-md bg-[#1a2a3d]/92 border border-[#567494] text-[#f5efe4] font-bold text-sm flex items-center justify-center active:bg-[#e6a63e] active:text-[#141d28]"
            >
              ▲
            </button>
            <div />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Drive Left"
              onPointerDown={() => onVirtualMove(-1, 0)}
              onPointerUp={() => onVirtualMove(0, 0)}
              onPointerLeave={() => onVirtualMove(0, 0)}
              className="w-11 h-11 rounded-md bg-[#1a2a3d]/92 border border-[#567494] text-[#f5efe4] font-bold text-sm flex items-center justify-center active:bg-[#e6a63e] active:text-[#141d28]"
            >
              ◀
            </button>
            <div />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Drive Right"
              onPointerDown={() => onVirtualMove(1, 0)}
              onPointerUp={() => onVirtualMove(0, 0)}
              onPointerLeave={() => onVirtualMove(0, 0)}
              className="w-11 h-11 rounded-md bg-[#1a2a3d]/92 border border-[#567494] text-[#f5efe4] font-bold text-sm flex items-center justify-center active:bg-[#e6a63e] active:text-[#141d28]"
            >
              ▶
            </button>
            <div />
            <button
              type="button"
              tabIndex={-1}
              aria-label="Drive Down"
              onPointerDown={() => onVirtualMove(0, -1)}
              onPointerUp={() => onVirtualMove(0, 0)}
              onPointerLeave={() => onVirtualMove(0, 0)}
              className="w-11 h-11 rounded-md bg-[#1a2a3d]/92 border border-[#567494] text-[#f5efe4] font-bold text-sm flex items-center justify-center active:bg-[#e6a63e] active:text-[#141d28]"
            >
              ▼
            </button>
            <div />
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onSteamBoost();
            }}
            aria-label="Trigger Steam Boost Mobile"
            className={`pointer-events-auto h-14 px-4 rounded-xl border-2 font-display text-sm font-bold flex items-center gap-2 shrink-0 ${
              hud.steamReady
                ? 'bg-[#e6a63e] border-[#fff0c2] text-[#141d28]'
                : 'bg-[#1a2a3d]/92 border-[#435d7a] text-[#9ab2c9]'
            }`}
          >
            <SteamIcon className="w-5 h-5" />
            <span>{hud.steamReady ? 'STEAM!' : `${Math.round(hud.steamChargeRatio * 100)}%`}</span>
          </button>
        </div>

        {/* Center Compact Truck Gauges: Snow Load & Steam Boost */}
        <div
          className="rounded-lg border border-[#e6b04e]/35 px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_6px_18px_rgba(9,15,24,0.45)] flex items-center gap-3.5 sm:gap-5 pointer-events-auto max-w-full"
          style={{ backgroundColor: 'rgba(20, 32, 47, 0.92)' }}
        >
          {/* Blade Snow Load Meter */}
          <div className="w-32 sm:w-40">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold mb-1">
              <span className={loadReadyToBank ? 'text-[#ffd56b]' : 'text-[#c5d6e8]'}>
                {loadReadyToBank ? 'BANK AT GRATE' : 'PLOW LOAD'}
              </span>
              <span className="font-mono-num text-[#fbf4e7]">{Math.round(hud.snowLoadRatio * 100)}%</span>
            </div>
            <div className="h-2.5 w-full rounded-sm bg-[#0f1a27] overflow-hidden border border-[#3a526c]/70">
              <div
                className={`h-full origin-left transition-transform duration-100 ${
                  loadReadyToBank ? 'bg-[#ff9f3d]' : 'bg-[#cde6ff]'
                }`}
                style={{ transform: `scaleX(${hud.snowLoadRatio})` }}
              />
            </div>
          </div>

          <div className="w-px h-7 sm:h-8 bg-[#3c5470]" aria-hidden="true" />

          {/* Steam Boost Gauge / Clickable Trigger */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onSteamBoost();
            }}
            className="flex items-center gap-2 text-left cursor-pointer"
            aria-label="Trigger Steam Boost"
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                hud.steamReady
                  ? 'bg-[#e6a63e] border-[#fff0c2]'
                  : 'bg-[#132030] border-[#3a526c]'
              }`}
            >
              <SteamIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="w-24 sm:w-32">
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold mb-1">
                <span className={hud.steamReady ? 'text-[#ffd56b]' : 'text-[#9ab2c9]'}>
                  STEAM
                </span>
                <span className="font-mono-num text-[#fbf4e7]">
                  {hud.steamReady ? 'READY' : `${Math.round(hud.steamChargeRatio * 100)}%`}
                </span>
              </div>
              <div className="h-2.5 w-full rounded-sm bg-[#0f1a27] overflow-hidden border border-[#3a526c]/70">
                <div
                  className={`h-full origin-left ${hud.steamReady ? 'bg-[#ffd266]' : 'bg-[#6ca0c9]'}`}
                  style={{ transform: `scaleX(${hud.steamChargeRatio})` }}
                />
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
