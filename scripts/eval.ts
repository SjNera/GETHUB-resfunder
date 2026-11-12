// Accuracy test for screening (TDD 10.5, task B5).
//
// Run:  npm run eval
//   =   node --experimental-strip-types --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --env-file-if-exists=.env scripts/eval.ts
// Needs Node 22.15+ (type stripping, module.registerHooks). No extra dependencies.
// Without GROQ_API_KEY and GROQ_MODEL only the "Code only" column runs.
// Items run one at a time to stay within Groq rate limits.
// The labels in data/labeled-set.json are drafts until a human has reviewed every one.
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import type { ScreenInput, SurveyJson } from '../lib/types';

// lib/ uses extensionless relative imports. Let Node resolve them to .ts files.
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (/^\.{1,2}\//.test(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});

// Loaded after the hook is registered.
const { z } = await import('zod');
const { runChecks } = await import('../lib/screening/checks');
const { screen } = await import('../lib/screening/index');
const { surveySchema, validateAnswers } = await import('../lib/survey-schema');

const LABELS_REVIEWED = false;
const DURATION_MS = 60_000; // well above the too_fast threshold for one question
const AI_PAUSE_MS = Number(process.env.EVAL_PAUSE_MS ?? 4000); // between items, Groq rate limits

const JUNK_CATEGORIES = ['empty', 'gibberish', 'off_question', 'evasive', 'copied', 'injection'] as const;
const GENUINE_CATEGORIES = ['genuine', 'genuine_short', 'genuine_taglish'] as const;

const itemSchema = z
  .object({
    id: z.string().min(1),
    question: z.string().min(1),
    answer: z.string(),
    allowShort: z.boolean(),
    human: z.enum(['genuine', 'junk']),
    category: z.enum([...GENUINE_CATEGORIES, ...JUNK_CATEGORIES]),
  })
  .strict()
  .refine((i) => (i.human === 'junk') === (JUNK_CATEGORIES as readonly string[]).includes(i.category), {
    message: 'human and category disagree',
  });

/** TDD 10.5. */
interface LabeledItem {
  id: string;
  question: string;
  answer: string;
  allowShort: boolean;
  human: 'genuine' | 'junk';
  category: (typeof GENUINE_CATEGORIES)[number] | (typeof JUNK_CATEGORIES)[number];
}

interface Outcome {
  item: LabeledItem;
  codeFlagged: boolean;
  aiFlagged: boolean | null; // null when the AI column is skipped
  note: string;
}

function loadItems(): LabeledItem[] {
  const raw: unknown = JSON.parse(readFileSync(new URL('../data/labeled-set.json', import.meta.url), 'utf8'));
  const items: LabeledItem[] = z.array(itemSchema).parse(raw);
  if (new Set(items.map((i) => i.id)).size !== items.length) throw new Error('Duplicate item ids');
  return items;
}

/** One required open-ended question, no prior data. */
function toInput(item: LabeledItem): ScreenInput {
  const survey: SurveyJson = {
    title: `Eval ${item.id}`,
    description: '',
    questions: [{ id: 'q1', type: 'open_ended', text: item.question, required: true, allowShort: item.allowShort }],
  };
  const answers = { q1: item.answer };
  const parsed = surveySchema.safeParse(survey);
  if (!parsed.success) throw new Error(`Item ${item.id}: survey fails surveySchema`);
  const valid = validateAnswers(survey, answers);
  if (!valid.ok) throw new Error(`Item ${item.id}: ${valid.message}`);
  return { survey, answers, durationMs: DURATION_MS, prior: { openTexts: {}, durationsMs: [] } };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function excerpt(text: string, max = 60): string {
  const t = JSON.stringify(text);
  return t.length > max ? `${t.slice(0, max - 4)}..."` : t;
}

function pct(n: number, d: number): string {
  return d === 0 ? '-' : `${Math.round((100 * n) / d)}%`;
}

function cell(flagged: number, total: number): string {
  return `${flagged}/${total} (${pct(flagged, total)})`;
}

function printTable(outcomes: Outcome[], aiOn: boolean): void {
  const junk = outcomes.filter((o) => o.item.human === 'junk');
  const genuine = outcomes.filter((o) => o.item.human === 'genuine');
  const count = (list: Outcome[], col: 'code' | 'ai') =>
    list.filter((o) => (col === 'code' ? o.codeFlagged : o.aiFlagged === true)).length;
  const aiCell = (list: Outcome[]) => (aiOn ? cell(count(list, 'ai'), list.length) : 'skipped');

  const rows: [string, string, string][] = [
    ['Junk caught (flagged / total junk)', cell(count(junk, 'code'), junk.length), aiCell(junk)],
    ['Genuine wrongly flagged', cell(count(genuine, 'code'), genuine.length), aiCell(genuine)],
  ];
  for (const cat of JUNK_CATEGORIES) {
    const list = junk.filter((o) => o.item.category === cat);
    rows.push([`  caught: ${cat}`, cell(count(list, 'code'), list.length), aiCell(list)]);
  }
  for (const cat of GENUINE_CATEGORIES) {
    const list = genuine.filter((o) => o.item.category === cat);
    rows.push([`  wrongly flagged: ${cat}`, cell(count(list, 'code'), list.length), aiCell(list)]);
  }

  const header: [string, string, string] = ['Metric', 'Code only', 'Code + AI'];
  const w = [0, 1, 2].map((i) => Math.max(header[i].length, ...rows.map((r) => r[i].length)));
  const line = (r: [string, string, string]) => `| ${r.map((c, i) => c.padEnd(w[i])).join(' | ')} |`;
  console.log(line(header));
  console.log(`|${w.map((n) => '-'.repeat(n + 2)).join('|')}|`);
  for (const r of rows) console.log(line(r));
}

function printMisses(outcomes: Outcome[], col: 'code' | 'ai'): void {
  const misses = outcomes.filter((o) => {
    const flagged = col === 'code' ? o.codeFlagged : o.aiFlagged === true;
    return flagged !== (o.item.human === 'junk');
  });
  console.log(`\nMisses, ${col === 'code' ? 'Code only' : 'Code + AI'} (${misses.length}):`);
  if (misses.length === 0) console.log('  none');
  for (const o of misses) {
    const kind = o.item.human === 'junk' ? 'junk not caught' : 'genuine flagged';
    const note = col === 'ai' && o.note ? `  [${o.note}]` : '';
    console.log(`  ${o.item.id.padEnd(4)} ${o.item.category.padEnd(15)} ${kind.padEnd(15)} ${excerpt(o.item.answer)}${note}`);
  }
}

async function main(): Promise<void> {
  const items = loadItems();
  const aiOn = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_MODEL);

  console.log(`Labeled set: ${items.length} items (data/labeled-set.json)`);
  console.log(LABELS_REVIEWED ? 'Labels: human-reviewed.' : 'Labels: draft, not yet human-reviewed.');
  if (aiOn) console.log(`Code + AI: on, model ${process.env.GROQ_MODEL}. Running sequentially.`);
  else console.log('Code + AI: skipped, GROQ_API_KEY and GROQ_MODEL are not set.');
  console.log('');

  const outcomes: Outcome[] = [];
  let inconclusive = 0;
  for (const [n, item] of items.entries()) {
    const input = toInput(item);
    const codeFlagged = runChecks(input).hardFails.length > 0;
    let aiFlagged: boolean | null = null;
    let note = '';
    if (aiOn) {
      if (n > 0) await sleep(AI_PAUSE_MS);
      const out = await screen(input);
      const hard = out.signals.hardFails.length > 0;
      const ai = out.ai;
      // Code + AI: hard fails, or AI not valid, or injection.
      aiFlagged = hard || (ai !== null && (ai.label !== 'valid' || ai.injection));
      if (ai && !ai.agreed) inconclusive++;
      note = ai ? `ai=${ai.label}${ai.type ? `/${ai.type}` : ''}${ai.injection ? ' injection' : ''}${ai.agreed ? '' : ' inconclusive'}` : hard ? 'hard fail, ai not called' : 'ai not called';
      process.stdout.write(`  ${item.id}: ${aiFlagged ? 'flagged' : 'passed'}\n`);
    }
    outcomes.push({ item, codeFlagged, aiFlagged, note });
  }
  if (aiOn) console.log('');

  printTable(outcomes, aiOn);
  printMisses(outcomes, 'code');
  if (aiOn) {
    printMisses(outcomes, 'ai');
    if (inconclusive > 0) {
      console.log(`\nNote: ${inconclusive} item(s) had an inconclusive AI result (run failure, timeout or disagreement).`);
      console.log('Rate limits can cause this. Raise EVAL_PAUSE_MS and rerun if the count is high.');
    }
  } else {
    console.log('\nCode + AI column skipped: set GROQ_API_KEY and GROQ_MODEL (e.g. in .env) and run `npm run eval`.');
  }
}

await main();
