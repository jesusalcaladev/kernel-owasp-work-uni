// src/ink/theme.ts
// Hacker aesthetic theme — dark backgrounds, neon accents, CRT glow

export const THEME = {
  bg: '#0d0208',
  primary: '#00ff41',
  accent: '#00ffff',
  danger: '#ff0040',
  warning: '#ffb000',
  muted: '#008f11',
  white: '#f1f1f1',
  gray: '#555555',
  
  A02: { primary: '#ff3344', accent: '#ff8800' },
  A07: { primary: '#ffaa22', accent: '#ff6600' },
  A10: { primary: '#aa44ff', accent: '#6622cc' },
};

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const PACE = {
  TICK: 35,
  TYPE: 18,
  FAST: 8,
  BEAT: 420,
  REVEAL: 900,
  STEP: 700,
  DRAMATIC: 1400,
  GLITCH: 50,
  MATRIX: 30,
};
