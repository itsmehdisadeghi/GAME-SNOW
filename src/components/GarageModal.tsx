import React from 'react';
import { UPGRADE_DEFS, getUpgradeCost } from '../game/logic';
import type { UpgradeId, UpgradeLevels } from '../game/types';
import { CoinIcon, WrenchIcon } from './HudIcons';

interface GarageModalProps {
  coins: number;
  upgrades: UpgradeLevels;
  onBuy: (id: UpgradeId) => void;
  onClose: () => void;
}

export function GarageModal({ coins, upgrades, onBuy, onClose }: GarageModalProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(11, 18, 28, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="garage-modal-title"
    >
      <div
        className="w-full max-w-2xl rounded-xl border-2 border-[#e6b04e]/60 p-6 shadow-[0_20px_50px_rgba(6,11,18,0.75)]"
        style={{ backgroundColor: '#162333' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#314862]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#243850] border border-[#e6b04e]/50 flex items-center justify-center">
              <WrenchIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 id="garage-modal-title" className="font-display text-2xl font-bold text-[#fbf4e7]">
                Alpine Plow Garage
              </h2>
              <p className="text-xs text-[#b9cde0]">
                Upgrades mount immediately on your truck · Keys 1–5 to buy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0f1a27] border border-[#3a526c]">
            <CoinIcon className="w-5 h-5" />
            <span className="font-mono-num text-lg font-bold text-[#ffd670]">{coins}</span>
          </div>
        </div>

        {/* Upgrade Rows */}
        <div className="mt-4 flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {UPGRADE_DEFS.map((def) => {
            const level = upgrades[def.id];
            const isMax = level >= def.maxLevel;
            const cost = getUpgradeCost(def.id, level);
            const affordable = !isMax && coins >= cost;

            return (
              <div
                key={def.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-[#2f455e] px-4 py-3"
                style={{ backgroundColor: '#1c2d42' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono-num text-xs font-bold text-[#e6b04e]">
                      [{def.keyHint}]
                    </span>
                    <span className="font-display text-base font-bold text-[#fbf4e7]">
                      {def.name}
                    </span>
                    <div className="flex items-center gap-1 ml-1" aria-label={`Level ${level} of ${def.maxLevel}`}>
                      {Array.from({ length: def.maxLevel }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-2.5 h-2.5 rounded-xs border ${
                            i < level
                              ? 'bg-[#e8b14e] border-[#fff0c4]'
                              : 'bg-[#101c2a] border-[#3d5672]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-[#c7d7e6] mt-0.5">{def.shortRole}</div>
                  <div className="text-xs font-mono-num text-[#92bee0] mt-1">
                    {def.formatEffect(level)}
                    {!isMax && `  →  ${def.formatEffect(level + 1)}`}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => onBuy(def.id)}
                  className={`px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap shrink-0 flex items-center justify-center gap-1.5 border transition-colors ${
                    isMax
                      ? 'bg-[#152434] border-[#324a64] text-[#7c9ab8] cursor-default'
                      : affordable
                        ? 'bg-[#d44634] hover:bg-[#e55542] border-[#f2c478] text-[#fdf7ee] cursor-pointer'
                        : 'bg-[#14202f] border-[#2e4259] text-[#6d859e] cursor-not-allowed'
                  }`}
                >
                  {isMax ? (
                    <span>MAXED</span>
                  ) : (
                    <>
                      <CoinIcon className="w-4 h-4" />
                      <span className="font-mono-num">{cost}</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-[#314862] flex items-center justify-between">
          <span className="text-xs text-[#a9c0d6]">Shift timer pauses while in the Garage</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-[#e6a63e] hover:bg-[#f0b44e] text-[#141d28] text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
          >
            Back to Plowing [U]
          </button>
        </div>
      </div>
    </div>
  );
}
