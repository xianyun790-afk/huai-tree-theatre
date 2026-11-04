import {useEffect, useRef} from 'react';
export function useBeep(enabled: boolean) {
  const context = useRef<AudioContext | null>(null);
  useEffect(() => () => { void context.current?.close(); }, []);
  return () => {
    if (!enabled) return;
    try {
      const ac = context.current ?? (context.current = new AudioContext()); void ac.resume();
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(610, ac.currentTime); o.frequency.exponentialRampToValueAtTime(920, ac.currentTime + .1);
      g.gain.setValueAtTime(.055, ac.currentTime); g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .16);
      o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + .17);
    } catch { /* Optional audio never blocks the story. */ }
  };
}
