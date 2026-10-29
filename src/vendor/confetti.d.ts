// confetti.js (https://confettijs.org, ISC), bundled as-is. Importing it sets window.confetti.
export {};

declare global {
  function confetti(options?: { position?: { x: number; y: number }; count?: number; size?: number; velocity?: number; fade?: boolean }): void;
}
