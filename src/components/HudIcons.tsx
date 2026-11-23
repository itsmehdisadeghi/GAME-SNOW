import React from 'react';

export function HearthplowEmblem({ className = 'w-14 h-14' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      {/* Dark alpine crest silhouette */}
      <path
        d="M32 4L56 16V38C56 49 44.5 57.5 32 60C19.5 57.5 8 49 8 38V16L32 4Z"
        fill="#162231"
        stroke="#e6b04e"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Inner alpine roof / snow peak */}
      <path d="M16 36L32 16L48 36H16Z" fill="#283d54" stroke="#f5efe4" strokeWidth="2" strokeLinejoin="round" />
      {/* Snow cap */}
      <path d="M25.5 24.5L32 16L38.5 24.5L35 23L32 25.5L29 23L25.5 24.5Z" fill="#f5f9ff" />
      {/* Curved brass V-plow blade */}
      <path
        d="M15 41C21 46 43 46 49 41L46 49C39 52.5 25 52.5 18 49L15 41Z"
        fill="#e6b04e"
        stroke="#101a26"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Warm hearth diamond */}
      <path d="M32 28L36 33L32 38L28 33L32 28Z" fill="#ff9636" />
    </svg>
  );
}

export function CottagePipIcon({ rescued }: { rescued: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path
        d="M3 11.5L12 4L21 11.5V20H3V11.5Z"
        fill={rescued ? '#e8a848' : '#243447'}
        stroke="#0e1722"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M2 12L12 3.5L22 12"
        stroke={rescued ? '#fff5df' : '#85a2bf'}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="9.5"
        y="12.5"
        width="5"
        height="4.5"
        rx="0.6"
        fill={rescued ? '#fff4be' : '#4a6480'}
        stroke="#0e1722"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function CoinIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" fill="#e6ac42" stroke="#101924" strokeWidth="2" />
      <circle cx="12" cy="12" r="6.2" fill="#ffd97a" stroke="#b3781d" strokeWidth="1.4" />
      <path d="M12 8V16M9.5 10.5H14.5" stroke="#7d4f10" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SteamIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 14C4 10.7 6.7 8 10 8C10.9 5.7 13.1 4 15.8 4C19.2 4 22 6.8 22 10.2C22 13.2 19.7 15.7 16.8 16H7C5.3 16 4 15.1 4 14Z"
        fill="#ffd28a"
        stroke="#101924"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M6 19.5H15M9 22H18" stroke="#ff9f43" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function WrenchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M14.7 6.3A4.5 4.5 0 0 0 8.5 11.7L3.8 16.4A1.8 1.8 0 0 0 6.4 19L11.1 14.3A4.5 4.5 0 0 0 16.5 8.1L14.2 10.4L12.4 8.6L14.7 6.3Z"
        fill="#f0c878"
        stroke="#101924"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SoundIcon({ muted, className = 'w-4 h-4' }: { muted: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 9.5H8.5L14 5V19L8.5 14.5H4V9.5Z"
        fill="#f5efe4"
        stroke="#101924"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M17 9L21 15M21 9L17 15" stroke="#f0786c" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <>
          <path d="M17.2 8.8C18.5 10.1 18.5 13.9 17.2 15.2" stroke="#f0c878" strokeWidth="2" strokeLinecap="round" />
          <path d="M19.8 6.5C22.2 9.2 22.2 14.8 19.8 17.5" stroke="#f0c878" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function PauseIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="6" y="5" width="4.5" height="14" rx="1" fill="#f5efe4" stroke="#101924" strokeWidth="1.6" />
      <rect x="13.5" y="5" width="4.5" height="14" rx="1" fill="#f5efe4" stroke="#101924" strokeWidth="1.6" />
    </svg>
  );
}

export function RestartIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M19 12A7 7 0 1 1 16.9 7"
        stroke="#f5efe4"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M17 3.5V7.8H12.7" stroke="#f0c878" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
