import {ROOMS} from './schema.ts';
import {HOUSE_ROOMS} from './house/layout.ts';
import {validKitchen} from './house/kitchen.ts';
import type { Condition, Progress, Story } from './schema.ts';
export type { Body, Target, Progress, Story } from './schema.ts';
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
// A content revision key, not a security hash. Formatting and object key order do not reset saves.
export function definitionKey(story: Story): string {
  let a = 2166136261; for (const c of canonical(story)) { a ^= c.charCodeAt(0); a = Math.imul(a, 16777619); } return (a >>> 0).toString(16);
}
export function freshProgress(story: Story, name = '小余'): Progress {
  return { ...(story.world.stage==='house'?{room:'street' as const}:{}), version: 3, storyId: story.id, definitionKey: definitionKey(story), started: false, name: name.trim().slice(0, 16) || '小余', clues: [], flags: {}, choices: {}, dialogueId: null, endingId: null };
}
export function matches(c: Condition | undefined, p: Progress): boolean {
  if (!c) return true;
  switch (c.type) {
    case 'always': return true;
    case 'ended': return p.endingId !== null;
    case 'clue': return p.clues.includes(c.id);
    case 'flag': return p.flags[c.key] === true;
    case 'choice': return p.choices[c.key] === c.value;
    case 'all': return c.conditions.every(x => matches(x, p));
    case 'any': return c.conditions.some(x => matches(x, p));
    case 'not': return !matches(c.condition, p);
  }
}
export function objective(story: Story, p: Progress) {
  const index = story.goals.findIndex(g => !matches(g.completeWhen, p));
  const i = index < 0 ? story.goals.length - 1 : index;
  return { ...story.goals[i], number: String(i + 1).padStart(2, '0'), total: String(story.goals.length).padStart(2, '0') };
}
export function startStory(story: Story, name: string): Progress { return { ...freshProgress(story, name), started: true, dialogueId: story.intro }; }
export function interact(story: Story, p: Progress, target: import('./schema.ts').Target): Progress {
  if (!p.started || p.endingId) return p;
  if(story.world.stage==='house'){
    const room=p.room??'street';const destination=HOUSE_ROOMS[room].doors[target];
    if(destination)return {...p,room:destination,dialogueId:null};
    if(!HOUSE_ROOMS[room].targets[target])return p;
  }
  const route = story.interactions[target]?.find(r => matches(r.when, p));
  // The kitchen can be investigated before the television. Story evidence remains independent.
  if(story.id==='haunted-house'&&p.room==='kitchen'){
    if(target==='fridge')return {...p,dialogueId:p.flags.fridge_cooled?'fridge_ok':'fridge'};
    if(target==='shopping-bag')return {...p,dialogueId:p.clues.includes('skull')?'bag_empty':p.flags.fridge_cooled?'bag':'bag_wait'};
  }
  return route ? { ...p, dialogueId: route.dialogue } : p;
}
export function choose(story: Story, p: Progress, id: string): Progress {
  if (!p.dialogueId || p.endingId) return p;
  const choice = story.dialogues[p.dialogueId]?.choices.find(c => c.id === id);
  if (!choice || !matches(choice.requires, p)) return p;
  const next: Progress = { ...p, clues: [...p.clues], flags: { ...p.flags }, choices: { ...p.choices }, dialogueId: choice.next ?? null };
  for (const effect of choice.effects ?? []) {
    if (effect.type === 'clue' && !next.clues.includes(effect.id)) next.clues.push(effect.id);
    if (effect.type === 'flag') next.flags[effect.key] = effect.value;
    if (effect.type === 'choice') next.choices[effect.key] = effect.value;
    if (effect.type === 'ending') { next.endingId = effect.id; next.dialogueId = null; }
  }
  return next;
}
export function endingText(story: Story, p: Progress) { return p.endingId ? story.endings[p.endingId] : null; }
export function formatText(text: string, p: Pick<Progress, 'name'>) { return text.replaceAll('{{playerName}}', p.name); }
export function parseProgress(raw: string | null, story: Story): Progress | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw); const plain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
    if (!plain(p) || p.version !== 3 || p.storyId !== story.id || p.definitionKey !== definitionKey(story) || typeof p.started !== 'boolean' || typeof p.name !== 'string' || p.name.length > 16 || !Array.isArray(p.clues) || new Set(p.clues).size !== p.clues.length || !plain(p.flags) || !plain(p.choices)) return null;
    if (story.world.stage==='house' ? !ROOMS.includes(p.room as never) : p.room !== undefined) return null;
    if(p.kitchen!==undefined){
      if(story.id!=='haunted-house'||!validKitchen(p.kitchen)||!p.started)return null;
      if((p.kitchen.potMoved||p.kitchen.heat===0)!==(p.flags.fridge_cooled===true))return null;
    }
    if (!p.started && p.room !== undefined && p.room !== 'street') return null;
    if (p.clues.some(id => typeof id !== 'string' || !story.clues.some(c => c.id === id))) return null;
    if (Object.entries(p.flags).some(([key, v]) => !story.state.flags.includes(key) || typeof v !== 'boolean')) return null;
    if (Object.entries(p.choices).some(([key, v]) => typeof v !== 'string' || !Object.hasOwn(story.state.choices, key) || !story.state.choices[key].includes(v))) return null;
    if (p.dialogueId !== null && (typeof p.dialogueId !== 'string' || !Object.hasOwn(story.dialogues, p.dialogueId))) return null;
    if (p.endingId !== null && (typeof p.endingId !== 'string' || !Object.hasOwn(story.endings, p.endingId))) return null;
    if (p.endingId && p.dialogueId) return null;
    if (!p.started && (p.dialogueId || p.endingId || p.clues.length || Object.keys(p.flags).length || Object.keys(p.choices).length)) return null;
    return p as unknown as Progress;
  } catch { return null; }
}
