import React from 'react';
import type { GameMode } from '../game/types';
import { HearthplowEmblem } from './HudIcons';

interface TitleOverlayProps {
  mode: GameMode;
  bestScore: number;
  onSelectMode: (mode: GameMode) => void;
  onStart: () => void;
}

export function TitleOverlay({ mode, bestScore, onSelectMode, onStart }: TitleOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 sm:p-10"
      style={{
        background:
          'linear-gradient(96deg, rgba(16, 26, 39, 0.88) 0%, rgba(16, 26, 39, 0.62) 34%, rgba(16, 26, 39, 0.08) 64%, rgba(16, 26, 39, 0) 100%)',
      }}
    >
      {/* Top quiet spacer / best score readout */}
      <div className="flex items-center justify-end min-h-[20px]">
        {bestScore > 0 && (
          <div className="text-sm font-semibold text-[#f3cf82] hud-text-shadow font-mono-num">
            Best {bestScore.toLocaleString()}
          </div>
        )}
      </div>

      {/* Left-third Title Lockup & Primary Start CTA over calm negative space */}
      <div className="max-w-md pointer-events-auto flex flex-col items-start gap-6 my-auto">
        <div className="flex items-center gap-4">
          <HearthplowEmblem className="w-16 h-16 shrink-0" />
          <div>
            <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-[#fbf5ea] hud-stroke leading-none">
              Hearthplow
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#d8e3ef] leading-relaxed hud-text-shadow max-w-sm">
              Carve snow-buried village plazas, bank heavy drifts into glowing thermal grates, and warm every cottage before dusk.
            </p>
          </div>
        </div>

        {/* Mode selector (functional segmented control) */}
        <div
          className="inline-flex items-center gap-1 p-1 rounded-lg border border-[#e6b04e]/30"
          style={{ backgroundColor: 'rgba(18, 29, 43, 0.92)' }}
          role="group"
          aria-label="Game mode"
        >
          <button
            type="button"
            onClick={() => onSelectMode('arcade')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'arcade'
                ? 'bg-[#e6a63e] text-[#141d28]'
                : 'text-[#cfdbe8] hover:text-white'
            }`}
          >
            Arcade Shift
          </button>
          <button
            type="button"
            onClick={() => onSelectMode('zen')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              mode === 'zen'
                ? 'bg-[#e6a63e] text-[#141d28]'
                : 'text-[#cfdbe8] hover:text-white'
            }`}
          >
            Zen Chill (No Timer)
          </button>
        </div>

        {/* Primary Start CTA */}
        <button
          type="button"
          data-start="true"
          onClick={(e) => {
            e.currentTarget.blur();
            onStart();
          }}
          className="px-8 py-3.5 rounded-lg bg-[#d44634] hover:bg-[#e3523f] active:translate-y-0.5 text-[#fdf7ee] font-display text-xl font-bold tracking-wide border-2 border-[#f2c478] shadow-[0_6px_0_#7d2116,0_12px_24px_rgba(9,14,22,0.55)] transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffd580]"
        >
          Start Plow Shift
        </button>
      </div>

      {/* Single flat borderless control-hint line in bottom safe margin */}
      <div className="text-xs sm:text-sm text-[#dbe6f2]/90 hud-text-shadow flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>WASD / Arrows Drive</span>
        <span aria-hidden="true">·</span>
        <span>Space Steam Boost</span>
        <span aria-hidden="true">·</span>
        <span>U Garage</span>
        <span aria-hidden="true">·</span>
        <span>P Pause</span>
      </div>
    </div>
  );
}
