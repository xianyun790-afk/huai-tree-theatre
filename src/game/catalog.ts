import haunted from './stories/haunted-house.json' with { type: 'json' };
import swap from './stories/body-swap.json' with { type: 'json' };
import key from './stories/missing-key.json' with { type: 'json' };
import starter from './stories/starter.json' with { type: 'json' };
import { validateStory } from './validate.ts';
import type { Story } from './schema.ts';
function checked(input: unknown): Story { const result = validateStory(input); if (!result.ok) throw new Error(result.errors.join('\n')); return result.story; }
export const BUILTIN_STORIES: Story[] = [checked(swap), checked(key), checked(haunted)];
export const STARTER_STORY = checked(starter);
export const DEFAULT_STORY = BUILTIN_STORIES.find(s=>s.id==='haunted-house')!;
