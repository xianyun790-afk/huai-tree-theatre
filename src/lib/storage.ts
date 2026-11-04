import { definitionKey, freshProgress, parseProgress } from '../game/story.ts';
import { parseStory } from '../game/validate.ts';
import type { Progress, Story } from '../game/schema.ts';
export const LEGACY_KEY = 'body-swap-demo-v1';
const LIBRARY_KEY = 'town-theatre-stories-v1';
const SELECTED_KEY = 'town-theatre-selected-v1';
export function saveKey(story: Story) { return `town-theatre-save:${story.id}:${definitionKey(story)}`; }
export function migrateLegacy(raw: string | null, story: Story): Progress | null {
  if (!raw || story.id !== 'body-swap') return null;
  try {
    const old = JSON.parse(raw);
    if (!old || ![1, 2].includes(old.version) || typeof old.started !== 'boolean' || typeof old.name !== 'string' || old.name.length > 16 || typeof old.metInventor !== 'boolean' || typeof old.ending !== 'boolean' || !Array.isArray(old.clues) || new Set(old.clues).size !== old.clues.length || old.clues.some((v:unknown) => !['record', 'receipt', ...(old.version === 1 ? ['father'] : [])].includes(v as string)) || !Number.isInteger(old.attempts) || old.attempts < 0 || (old.deal !== null && !['proof', 'favor', 'broadcast'].includes(old.deal))) return null;
    const p = freshProgress(story, old.name); p.started = old.started; p.clues = old.clues.filter((c:string) => c !== 'father');
    if (old.metInventor) p.flags.briefed = true;
    if (old.deal) { p.flags.agreed = true; p.choices.approach = old.deal; }
    if (old.ending) { if (!old.metInventor || p.clues.length !== 2 || !old.deal) return null; p.endingId = old.deal; }
    return parseProgress(JSON.stringify(p), story);
  } catch { return null; }
}
export function loadProgress(story: Story): Progress {
  try { return parseProgress(localStorage.getItem(saveKey(story)), story) ?? migrateLegacy(localStorage.getItem(LEGACY_KEY), story) ?? freshProgress(story); } catch { return freshProgress(story); }
}
export function saveProgress(story: Story, p: Progress): boolean { try { localStorage.setItem(saveKey(story), JSON.stringify(p)); return true; } catch { return false; } }
export function loadSelectedId(): string { try { return localStorage.getItem(SELECTED_KEY) ?? 'haunted-house'; } catch { return 'haunted-house'; } }
export function saveSelectedId(id: string) { try { localStorage.setItem(SELECTED_KEY, id); return true; } catch { return false; } }
export function loadCustomStories(): Story[] {
  try { const values = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '[]'); if (!Array.isArray(values)) return []; const result: Story[] = []; for (const raw of values.slice(0, 10)) { const p = parseStory(JSON.stringify(raw)); if (p.ok && !['body-swap', 'missing-key', 'haunted-house'].includes(p.story.id) && !result.some(s => s.id === p.story.id)) result.push(p.story); } return result; } catch { return []; }
}
export function saveCustomStories(stories: Story[]) { try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(stories)); return true; } catch { return false; } }
