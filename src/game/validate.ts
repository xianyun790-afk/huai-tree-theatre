import {HOUSE_OBJECTS} from './house/layout.ts';
import { BODIES, PROP_PORTRAITS, type Story } from './schema.ts';
export const MAX_STORY_BYTES = 200_000;
type ObjectValue = Record<string, unknown>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === 'object' && !Array.isArray(v);
const own = (v: ObjectValue, key: string) => Object.hasOwn(v, key);
const safeId = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9_-]{0,47}$/.test(v) && !['constructor', 'prototype', '__proto__'].includes(v);
export type Validation = { ok: true; story: Story } | { ok: false; errors: string[] };
export function validateStory(value: unknown): Validation {
  const errors: string[] = [];
  const error = (path: string, message: string) => { if (errors.length < 16) errors.push(`${path}：${message}`); };
  const text = (v: unknown, path: string, max = 600) => { if (typeof v !== 'string' || !v.trim() || v.length > max) error(path, `应为 1–${max} 字的文字`); };
  const id = (v: unknown, path: string) => { if (!safeId(v)) error(path, '使用小写字母开头的标识，只包含字母、数字、短横线和下划线，最多 48 字符'); };
  const list = (v: unknown, path: string, min: number, max: number): unknown[] => { if (!Array.isArray(v) || v.length < min || v.length > max) { error(path, `应有 ${min}–${max} 项`); return []; } return v; };
  const body = (v: unknown, path: string) => { if (!BODIES.includes(v as never)) error(path, '只能使用现有的 player / inventor / father / neighbor 模型'); };
  const record = (v: unknown, path: string): ObjectValue => { if (!object(v)) { error(path, '应为对象'); return {}; } return v; };
  if (!object(value)) return { ok: false, errors: ['剧本顶层应为 JSON 对象'] };
  const pending: [unknown, number][] = [[value, 0]]; let visited = 0;
  while (pending.length) { const [item, depth] = pending.pop()!; if (++visited > 12000 || depth > 28) return {ok:false,errors:['剧本结构过深或内容项过多，请拆成短篇故事']}; if (item && typeof item === 'object') { for (const [key, child] of Object.entries(item)) { if (['__proto__','prototype','constructor'].includes(key)) return {ok:false,errors:['剧本含有保留字段，请改用普通标识']}; pending.push([child,depth+1]); } } }
  if (value.formatVersion !== 1) error('formatVersion', '目前支持版本 1');
  id(value.id, 'id');
  for (const [key, max] of [['title', 40], ['description', 240], ['duration', 30], ['motivation', 160]] as const) text(value[key], key, max);
  list(value.headline, 'headline', 2, 2).forEach((v, i) => text(v, `headline[${i}]`, 30));
  function portrait(v: unknown, path: string) { const p = record(v, path); body(p.body, `${path}.body`); text(p.label, `${path}.label`, 40); if (p.caption !== undefined) text(p.caption, `${path}.caption`, 100); }
  list(value.cover, 'cover', 1, 4).forEach((v, i) => portrait(v, `cover[${i}]`));
  const world = record(value.world, 'world');
  if(world.stage!==undefined&&world.stage!=='house')error('world.stage','只支持 house，或省略使用街区');
  body(world.playerBody, 'world.playerBody');
  if (world.endingBody !== undefined) body(world.endingBody, 'world.endingBody');
  text(world.playerLabel, 'world.playerLabel', 60); text(world.controlHint, 'world.controlHint', 100);
  const cast = record(world.cast, 'world.cast'); const usedBodies: unknown[] = [world.playerBody];
  for (const slot of ['inventor', 'father', 'neighbor']) { const c = record(cast[slot], `world.cast.${slot}`); body(c.body, `world.cast.${slot}.body`); text(c.label, `world.cast.${slot}.label`, 40); usedBodies.push(c.body); }
  if (new Set(usedBodies).size !== 4) error('world.cast', '玩家和三位配角需要分别使用四个不同的身体模型');
  const locations = record(world.locations, 'world.locations'); text(locations.lab, 'world.locations.lab', 40); text(locations.mailbox, 'world.locations.mailbox', 40);
  const state = record(value.state, 'state');
  const flagList = list(state.flags, 'state.flags', 0, 40); flagList.forEach((v, i) => id(v, `state.flags[${i}]`));
  if (new Set(flagList).size !== flagList.length) error('state.flags', '标识不能重复');
  const flags = new Set(flagList);
  const choiceDefs = record(state.choices, 'state.choices');
  if (Object.keys(choiceDefs).length > 20) error('state.choices', '最多 20 类选择');
  for (const [key, values] of Object.entries(choiceDefs)) { id(key, `state.choices.${key}`); const a = list(values, `state.choices.${key}`, 1, 12); a.forEach((v, i) => id(v, `state.choices.${key}[${i}]`)); if (new Set(a).size !== a.length) error(`state.choices.${key}`, '值不能重复'); }
  const clueIds = new Set<unknown>();
  list(value.clues, 'clues', 0, 20).forEach((v, i) => { const c = record(v, `clues[${i}]`); id(c.id, `clues[${i}].id`); if (clueIds.has(c.id)) error(`clues[${i}].id`, '线索标识重复'); clueIds.add(c.id); text(c.title, `clues[${i}].title`, 60); text(c.source, `clues[${i}].source`, 100); text(c.text, `clues[${i}].text`, 1200); });
  const dialogues = record(value.dialogues, 'dialogues'); const endings = record(value.endings, 'endings');
  if (Object.keys(dialogues).length < 1 || Object.keys(dialogues).length > 80) error('dialogues', '需要 1–80 段对话');
  if (Object.keys(endings).length < 1 || Object.keys(endings).length > 12) error('endings', '需要 1–12 个结局');
  for (const [key, v] of Object.entries(endings)) { id(key, `endings.${key}`); const e = record(v, `endings.${key}`); text(e.title, `endings.${key}.title`, 80); text(e.text, `endings.${key}.text`, 1600); text(e.tag, `endings.${key}.tag`, 100); }
  function ref(v: unknown, table: ObjectValue | Set<unknown>, path: string) { id(v, path); if (!(table instanceof Set ? table.has(v) : typeof v === 'string' && own(table, v))) error(path, `找不到标识 ${String(v)}`); }
  function choiceRef(key: unknown, v: unknown, path: string) { ref(key, choiceDefs, `${path}.key`); const choices = typeof key === 'string' ? choiceDefs[key] : null; if (!Array.isArray(choices) || !choices.includes(v)) error(`${path}.value`, '不在已声明的选择值中'); }
  function condition(v: unknown, path: string, depth = 0): void {
    if (depth > 8) { error(path, '条件嵌套最多 8 层'); return; }
    const c = record(v, path);
    switch (c.type) {
      case 'always': case 'ended': break;
      case 'clue': ref(c.id, clueIds, `${path}.id`); break;
      case 'flag': ref(c.key, flags, `${path}.key`); break;
      case 'choice': choiceRef(c.key, c.value, path); break;
      case 'all': case 'any': list(c.conditions, `${path}.conditions`, 1, 12).forEach((x, i) => condition(x, `${path}.conditions[${i}]`, depth + 1)); break;
      case 'not': condition(c.condition, `${path}.condition`, depth + 1); break;
      default: error(`${path}.type`, '未知条件类型');
    }
  }
  let endingEffects = 0;
  for (const [key, raw] of Object.entries(dialogues)) {
    id(key, `dialogues.${key}`); const d = record(raw, `dialogues.${key}`); const path = `dialogues.${key}`;
    if(d.propPortrait!==undefined&&!PROP_PORTRAITS.includes(d.propPortrait as never))error(`${path}.propPortrait`,'请选择现有物品立绘');
    text(d.speaker, `${path}.speaker`, 60); text(d.caption, `${path}.caption`, 120); body(d.portrait, `${path}.portrait`);
    list(d.lines, `${path}.lines`, 1, 8).forEach((v, i) => text(v, `${path}.lines[${i}]`, 1200));
    if (d.pair !== undefined) list(d.pair, `${path}.pair`, 2, 2).forEach((v, i) => portrait(v, `${path}.pair[${i}]`));
    const choiceIds = new Set<unknown>();
    list(d.choices, `${path}.choices`, 1, 6).forEach((raw, i) => {
      const c = record(raw, `${path}.choices[${i}]`), cp = `${path}.choices[${i}]`; id(c.id, `${cp}.id`); if (choiceIds.has(c.id)) error(`${cp}.id`, '选项标识重复'); choiceIds.add(c.id);
      text(c.label, `${cp}.label`, 140); if (c.hint !== undefined) text(c.hint, `${cp}.hint`, 240);
      if (c.requires !== undefined) condition(c.requires, `${cp}.requires`);
      if (c.next !== undefined) ref(c.next, dialogues, `${cp}.next`);
      if (c.effects !== undefined) list(c.effects, `${cp}.effects`, 0, 12).forEach((v, n) => {
        const e = record(v, `${cp}.effects[${n}]`), ep = `${cp}.effects[${n}]`;
        switch (e.type) {
          case 'clue': ref(e.id, clueIds, `${ep}.id`); break;
          case 'flag': ref(e.key, flags, `${ep}.key`); if (typeof e.value !== 'boolean') error(`${ep}.value`, '应为 true / false'); break;
          case 'choice': choiceRef(e.key, e.value, ep); break;
          case 'ending': ref(e.id, endings, `${ep}.id`); endingEffects++; break;
          default: error(`${ep}.type`, '未知效果类型，不支持执行代码');
        }
      });
    });
  }
  if (!endingEffects) error('dialogues', '至少一个选项需要触发已定义的结局');
  ref(value.intro, dialogues, 'intro');
  const interactions = record(value.interactions, 'interactions');
  for (const [key, raw] of Object.entries(interactions)) {
    if (!(world.stage==='house'?HOUSE_OBJECTS.includes(key as never):['inventor','father','neighbor','lab','mailbox'].includes(key))) error(`interactions.${key}`, '此交互点不属于所选舞台');
    const routes = list(raw, `interactions.${key}`, 1, 16);
    routes.forEach((v, i) => { const r = record(v, `interactions.${key}[${i}]`); ref(r.dialogue, dialogues, `interactions.${key}[${i}].dialogue`); if (r.when !== undefined) condition(r.when, `interactions.${key}[${i}].when`); });
    const last = routes.at(-1); if (object(last) && last.when !== undefined && (!object(last.when) || last.when.type !== 'always')) error(`interactions.${key}`, '最后一项需要省略 when，作为可访问的默认对话');
  }
  const goalIds = new Set<unknown>();
  const goals = list(value.goals, 'goals', 1, 16);
  goals.forEach((v, i) => { const g = record(v, `goals[${i}]`), p = `goals[${i}]`; id(g.id, `${p}.id`); if (goalIds.has(g.id)) error(`${p}.id`, '任务标识重复'); goalIds.add(g.id); text(g.title, `${p}.title`, 80); text(g.detail, `${p}.detail`, 240); text(g.action, `${p}.action`, 100); if (typeof g.target !== 'string' || !own(interactions, g.target)) error(`${p}.target`, '需要对应一个已配置的交互点'); condition(g.completeWhen, `${p}.completeWhen`); });
  const lastGoal = goals.at(-1); if (object(lastGoal) && (!object(lastGoal.completeWhen) || lastGoal.completeWhen.type !== 'ended')) error('goals', '最后一步的 completeWhen 应为 {"type":"ended"}');
  return errors.length ? { ok: false, errors } : { ok: true, story: value as unknown as Story };
}
export function parseStory(text: string): Validation {
  if (new TextEncoder().encode(text).length > MAX_STORY_BYTES) return { ok: false, errors: ['剧本超过 200 KB，请缩短文字或拆成多个故事'] };
  try { return validateStory(JSON.parse(text)); } catch { return { ok: false, errors: ['JSON 格式错误，请检查逗号、引号和括号。可先下载示例再修改。'] }; }
}
