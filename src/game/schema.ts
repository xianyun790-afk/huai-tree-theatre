export const BODIES = ['player', 'inventor', 'father', 'neighbor'] as const;
export const TARGETS = ['inventor', 'father', 'neighbor', 'lab', 'mailbox', 'front-door', 'street-door', 'kitchen-door', 'study-door', 'yard-door', 'living-door', 'tv', 'sofa', 'fridge', 'shopping-bag', 'desk', 'vacuum', 'pit'] as const;
export const ROOMS = ['street','living','kitchen','study','yard'] as const;
export type Room = typeof ROOMS[number];
export type Body = typeof BODIES[number];
export type Target = typeof TARGETS[number];
export type CharacterSlot = 'inventor' | 'father' | 'neighbor';
export type Condition =
  | { type: 'always' | 'ended' }
  | { type: 'clue'; id: string }
  | { type: 'flag'; key: string }
  | { type: 'choice'; key: string; value: string }
  | { type: 'all' | 'any'; conditions: Condition[] }
  | { type: 'not'; condition: Condition };
export type Effect =
  | { type: 'clue'; id: string }
  | { type: 'flag'; key: string; value: boolean }
  | { type: 'choice'; key: string; value: string }
  | { type: 'ending'; id: string };
export interface StoryChoice {
  id: string;
  label: string;
  hint?: string;
  requires?: Condition;
  effects?: Effect[];
  next?: string;
}
export interface Portrait { body: Body; label: string; caption?: string }
export const PROP_PORTRAITS = ['tv','fridge','skull','photo','pit','vacuum','sofa'] as const;
export interface Dialogue {
  judgment?: {label?:string;question:string;evidence:string};
  propPortrait?: typeof PROP_PORTRAITS[number];
  speaker: string;
  caption: string;
  portrait: Body;
  lines: string[];
  pair?: [Portrait, Portrait];
  choices: StoryChoice[];
}
export interface WorldSetup {
  stage?: 'house';
  playerBody: Body;
  endingBody?: Body;
  playerLabel: string;
  controlHint: string;
  cast: Record<CharacterSlot, { body: Body; label: string }>;
  locations: { lab: string; mailbox: string };
}
export interface Story {
  formatVersion: 1;
  id: string;
  title: string;
  description: string;
  duration: string;
  headline: [string, string];
  motivation: string;
  cover: Portrait[];
  world: WorldSetup;
  state: { flags: string[]; choices: Record<string, string[]> };
  clues: { id: string; title: string; source: string; text: string; itemLabel?:string }[];
  goals: { id: string; title: string; detail: string; action: string; target: Target; completeWhen: Condition }[];
  intro: string;
  interactions: Partial<Record<Target, { when?: Condition; dialogue: string }[]>>;
  dialogues: Record<string, Dialogue>;
  endings: Record<string, { title: string; text: string; tag: string }>;
}
export interface Progress {
  kitchen?: import('./house/kitchen.ts').KitchenState;
  version: 3;
  storyId: string;
  definitionKey: string;
  started: boolean;
  name: string;
  clues: string[];
  flags: Record<string, boolean>;
  choices: Record<string, string>;
  room?: Room;
  dialogueId: string | null;
  endingId: string | null;
}
