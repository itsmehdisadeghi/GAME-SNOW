import React, { useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { GarageModal } from './components/GarageModal';
import { EndShiftModal, PauseModal } from './components/StatusModals';
import { TitleOverlay } from './components/TitleOverlay';
import { HearthplowEngine } from './game/engine';
import { DEFAULT_UPGRADES } from './game/logic';
import type { GameMode, HudSnapshot, RunSummary, UpgradeId } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  mode: 'arcade',
  districtIndex: 0,
  districtName: 'Pinebrook Square',
  clearPct: 0,
  targetClearPct: 82,
  rescuedCottages: 0,
  totalCottages: 3,
  coins: 0,
  score: 0,
  bestScore: 0,
  timeRemaining: 95,
  comboMultiplier: 1,
  comboCount: 0,
  comboTimerRatio: 0,
  snowLoadRatio: 0,
  snowLoadAmount: 0,
  steamChargeRatio: 1,
  steamReady: true,
  nearGrate: false,
  upgrades: { ...DEFAULT_UPGRADES },
  affordableUpgradeCount: 0,
  garageOpen: false,
  muted: false,
  callout: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<HearthplowEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);

  // Mount Three.js WebGL engine exactly once in an isolated sibling container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new HearthplowEngine(mount, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onRunEnd: (summary) => {
        setRunSummary(summary);
      },
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      engine.startNewGame('arcade');
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectMode = (mode: GameMode) => {
    engineRef.current?.setMode(mode);
  };

  const handleStart = () => {
    setRunSummary(null);
    engineRef.current?.startNewGame();
  };

  const handleNextDistrict = () => {
    setRunSummary(null);
    engineRef.current?.startNextDistrict();
  };

  const handleRetry = () => {
    setRunSummary(null);
    engineRef.current?.retryDistrict();
  };

  const handleReturnTitle = () => {
    setRunSummary(null);
    engineRef.current?.returnToTitle();
  };

  const handleBuyUpgrade = (id: UpgradeId) => {
    const bought = engineRef.current?.buyUpgrade(id);
    if (bought && runSummary) {
      setRunSummary((prev) => (prev ? { ...prev, totalCoins: Math.max(0, hud.coins) } : prev));
    }
  };

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#162231]">
      {/* Isolated WebGL canvas mount — never re-rendered by HUD state */}
      <div
        ref={canvasMountRef}
        data-testid="game-canvas-container"
        className="absolute inset-0 w-full h-full"
      />

      {/* Title Screen */}
      {hud.phase === 'title' && (
        <TitleOverlay
          mode={hud.mode}
          bestScore={hud.bestScore}
          onSelectMode={handleSelectMode}
          onStart={handleStart}
        />
      )}

      {/* Active Playing HUD */}
      {hud.phase === 'playing' && (
        <GameHud
          hud={hud}
          onOpenGarage={() => engineRef.current?.setGarageOpen(true)}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onTogglePause={() => engineRef.current?.togglePause()}
          onRestart={handleRetry}
          onSteamBoost={() => engineRef.current?.triggerSteamBoost()}
          onVirtualMove={(x, y) => engineRef.current?.setVirtualMove(x, y)}
        />
      )}

      {/* Garage Upgrade Overlay */}
      {hud.garageOpen && (
        <GarageModal
          coins={hud.coins}
          upgrades={hud.upgrades}
          onBuy={handleBuyUpgrade}
          onClose={() => engineRef.current?.setGarageOpen(false)}
        />
      )}

      {/* Pause Modal */}
      {hud.phase === 'paused' && (
        <PauseModal
          districtName={hud.districtName}
          onResume={() => engineRef.current?.togglePause()}
          onRestart={handleRetry}
          onTitle={handleReturnTitle}
        />
      )}

      {/* Victory / Dusk Settled Modal */}
      {hud.phase === 'gameover' && runSummary && !hud.garageOpen && (
        <EndShiftModal
          summary={{ ...runSummary, totalCoins: hud.coins }}
          onNextDistrict={handleNextDistrict}
          onRetry={handleRetry}
          onOpenGarage={() => engineRef.current?.setGarageOpen(true)}
          onTitle={handleReturnTitle}
        />
      )}
    </main>
  );
}
