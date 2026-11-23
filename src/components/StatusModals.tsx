import React from 'react';
import type { RunSummary } from '../game/types';

interface PauseModalProps {
  districtName: string;
  onResume: () => void;
  onRestart: () => void;
  onTitle: () => void;
}

export function PauseModal({ districtName, onResume, onRestart, onTitle }: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 18, 28, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div
        className="w-full max-w-sm rounded-xl border-2 border-[#e6b04e]/60 p-6 text-center shadow-[0_20px_50px_rgba(6,11,18,0.75)]"
        style={{ backgroundColor: '#162333' }}
      >
        <h2 id="pause-modal-title" className="font-display text-3xl font-bold text-[#fbf4e7]">
          Shift Paused
        </h2>
        <p className="mt-1 text-sm text-[#bdd0e3]">{districtName}</p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 rounded-lg bg-[#d44634] hover:bg-[#e55441] border-2 border-[#f2c478] text-[#fdf7ee] font-display text-lg font-bold cursor-pointer"
          >
            Resume Plowing
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-lg bg-[#22354c] hover:bg-[#2c4461] border border-[#45607d] text-[#edf4fb] text-sm font-semibold cursor-pointer"
          >
            Restart District
          </button>
          <button
            type="button"
            onClick={onTitle}
            className="w-full py-2.5 rounded-lg bg-transparent hover:bg-[#1e2f44] border border-[#344b66] text-[#bfd1e3] text-sm font-semibold cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
}

interface EndShiftModalProps {
  summary: RunSummary;
  onNextDistrict: () => void;
  onRetry: () => void;
  onOpenGarage: () => void;
  onTitle: () => void;
}

export function EndShiftModal({
  summary,
  onNextDistrict,
  onRetry,
  onOpenGarage,
  onTitle,
}: EndShiftModalProps) {
  const isVictory = summary.outcome === 'victory';

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(11, 18, 28, 0.76)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-shift-title"
    >
      <div
        className="w-full max-w-md rounded-xl border-2 border-[#e6b04e]/70 p-6 shadow-[0_22px_54px_rgba(6,11,18,0.8)]"
        style={{ backgroundColor: '#162333' }}
      >
        <div className="text-center">
          <h2 id="end-shift-title" className="font-display text-3xl font-bold text-[#fbf4e7]">
            {isVictory ? 'District Cleared!' : 'Dusk Has Settled'}
          </h2>
          <p className="mt-1 text-sm text-[#c7d8e8]">
            {isVictory
              ? `${summary.districtName} is warm, clear, and glowing.`
              : `${summary.districtName} still needs more plowing — keep your coins and upgrade!`}
          </p>
        </div>

        {/* 3 Tabular Stat Tiles */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="rounded-lg bg-[#1d2e43] border border-[#344c66] p-3 text-center">
            <div className="text-[10px] font-semibold text-[#acc2d8]">CLEARED</div>
            <div className="font-mono-num text-xl font-bold text-[#fbf4e7] mt-0.5">
              {summary.clearPct}%
            </div>
            <div className="text-[11px] font-mono-num text-[#9ab4cf]">
              {summary.rescuedCottages}/{summary.totalCottages} cabins
            </div>
          </div>

          <div className="rounded-lg bg-[#1d2e43] border border-[#344c66] p-3 text-center">
            <div className="text-[10px] font-semibold text-[#acc2d8]">PEAK FLOW</div>
            <div className="font-mono-num text-xl font-bold text-[#ffd56b] mt-0.5">
              ×{summary.peakCombo}
            </div>
            <div className="text-[11px] font-mono-num text-[#9ab4cf]">
              +{summary.coinsEarnedThisShift} coins
            </div>
          </div>

          <div className="rounded-lg bg-[#1d2e43] border border-[#344c66] p-3 text-center">
            <div className="text-[10px] font-semibold text-[#acc2d8]">SCORE</div>
            <div className="font-mono-num text-xl font-bold text-[#fbf4e7] mt-0.5">
              {summary.score.toLocaleString()}
            </div>
            <div className="text-[11px] font-mono-num text-[#e6b04e]">
              Best {summary.bestScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          {isVictory ? (
            <button
              type="button"
              data-start="true"
              onClick={onNextDistrict}
              className="w-full py-3 rounded-lg bg-[#d44634] hover:bg-[#e55441] border-2 border-[#f2c478] text-[#fdf7ee] font-display text-lg font-bold cursor-pointer"
            >
              Next Alpine District
            </button>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onRetry}
              className="w-full py-3 rounded-lg bg-[#d44634] hover:bg-[#e55441] border-2 border-[#f2c478] text-[#fdf7ee] font-display text-lg font-bold cursor-pointer"
            >
              Try District Again
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenGarage}
              className="py-2.5 rounded-lg bg-[#e6a63e] hover:bg-[#f0b44e] text-[#141d28] text-sm font-bold cursor-pointer"
            >
              Open Garage ({summary.totalCoins})
            </button>
            <button
              type="button"
              onClick={onTitle}
              className="py-2.5 rounded-lg bg-[#22354c] hover:bg-[#2c4461] border border-[#45607d] text-[#edf4fb] text-sm font-semibold cursor-pointer"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
