'use client';
// TEMPORARY validation lab. Delete with app/lab and lib/lab.
import { useRef, useState } from 'react';
import type { LabEvent } from '@/lib/lab/events';
import type { AiResult, DecisionResult, Signals } from '@/lib/types';

type Meta = { id: string; group: string; note: string; expected: DecisionResult };
type Row = {
  id: string;
  question?: string;
  answer?: string;
  signals?: Signals;
  ai?: { skipped: boolean; ai: AiResult | null; model: string | null; ms: number };
  verdict?: { result: DecisionResult; reasons: string[]; match: boolean };
};

const LABEL: Record<DecisionResult, string> = { pay: 'Pay', review: 'Review', dont_pay: "Don't pay" };
const HARD: Record<string, string> = { empty: 'Empty answer', gibberish: 'Unreadable text', duplicate: 'Same as another response' };
const WEAK: Record<string, string> = { too_fast: 'Completed unusually fast', straight_lining: 'Same option repeated' };

const css = `
.lab{--bg:#f6f7f5;--panel:#fff;--ink:#1b2220;--mut:#667470;--line:#e1e5e2;--ok:#1f7a4d;--okb:#e6f3ec;--warn:#a15c00;--warnb:#fff1d9;--bad:#b3321f;--badb:#fbe7e3;--info:#2f5d8a;--infob:#e5eef7;--skip:#eef0ef;
 background:var(--bg);color:var(--ink);font:14px/1.45 system-ui,sans-serif;min-height:100dvh;padding:20px max(16px,env(safe-area-inset-right)) 40px max(16px,env(safe-area-inset-left))}
@media(prefers-color-scheme:dark){.lab{--bg:#101413;--panel:#181d1b;--ink:#e7ecea;--mut:#93a09b;--line:#2a322f;--ok:#5fc78f;--okb:#16301f;--warn:#f0b35a;--warnb:#35280f;--bad:#f08a79;--badb:#3a1a15;--info:#8bb6e3;--infob:#172636;--skip:#1f2523;color-scheme:dark}}
.lab *{box-sizing:border-box}.lab h1{font-size:20px;margin:0 0 4px}.lab p{margin:0}.w{max-width:1100px;margin:0 auto}
.mut{color:var(--mut)}.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0}
.btn{font:inherit;font-weight:600;border:1px solid var(--line);background:var(--panel);color:var(--ink);padding:8px 14px;border-radius:8px;cursor:pointer}
.btn.pri{background:var(--ink);color:var(--bg);border-color:var(--ink)}.btn:disabled{opacity:.5;cursor:default}
.warnbox{background:var(--warnb);color:var(--warn);padding:10px 12px;border-radius:8px;margin:10px 0}
.sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}
.tile{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px}.tile b{display:block;font-size:22px}
.tile.bad b{color:var(--bad)}.tile.ok b{color:var(--ok)}
.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:14px;align-items:start}
@media(max-width:820px){.grid{grid-template-columns:minmax(0,1fr)}}
.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;min-width:0}
.list{display:flex;flex-direction:column;gap:6px;max-height:70dvh;overflow:auto}
.item{display:flex;gap:8px;align-items:center;justify-content:space-between;text-align:left;font:inherit;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:8px 10px;cursor:pointer;min-width:0}
.item[aria-current=true]{border-color:var(--ink)}.item .t{min-width:0;overflow-wrap:anywhere}.item small{display:block;color:var(--mut)}
.pill{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:99px;white-space:nowrap}
.pill.ok{background:var(--okb);color:var(--ok)}.pill.warn{background:var(--warnb);color:var(--warn)}.pill.bad{background:var(--badb);color:var(--bad)}.pill.mut{background:var(--skip);color:var(--mut)}
.q{font-size:12.5px;color:var(--mut);margin-bottom:4px}.ans{background:var(--skip);padding:10px 12px;border-radius:8px;overflow-wrap:anywhere;margin-bottom:12px}
.step{border-left:2px solid var(--line);padding:0 0 12px 12px;margin-left:6px}.step h3{font-size:13px;margin:0 0 6px}
.chk{display:flex;gap:8px;flex-wrap:wrap;margin:3px 0}.verdict{border-radius:10px;padding:10px 12px}
.verdict.ok{background:var(--okb)}.verdict.warn{background:var(--warnb)}.verdict.bad{background:var(--badb)}
.kv{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;font-size:13px}.kv dt{color:var(--mut)}.kv dd{margin:0;overflow-wrap:anywhere}
.spin{display:inline-block;animation:sp 1s linear infinite}@keyframes sp{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.spin{animation:none}}
`;

function tone(r: DecisionResult) {
  return r === 'pay' ? 'ok' : r === 'review' ? 'warn' : 'bad';
}

export function LabClient({ cases, hasAi, model }: { cases: Meta[]; hasAi: boolean; model: string | null }) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [sel, setSel] = useState<string>(cases[0]?.id ?? '');
  const [err, setErr] = useState('');
  const abort = useRef<AbortController | null>(null);

  function apply(e: LabEvent) {
    if (e.type === 'error') return setErr(e.message);
    if (e.type === 'done') return;
    setRows((prev) => {
      const r: Row = { ...(prev[e.id] ?? { id: e.id }) };
      if (e.type === 'case') {
        Object.assign(r, { question: e.question, answer: e.answer, signals: undefined, ai: undefined, verdict: undefined });
        setRunning(e.id);
        setSel(e.id);
      } else if (e.type === 'checks') r.signals = e.signals;
      else if (e.type === 'ai') r.ai = { skipped: e.skipped, ai: e.ai, model: e.model, ms: e.ms };
      else if (e.type === 'verdict') r.verdict = { result: e.result, reasons: e.reasons, match: e.match };
      return { ...prev, [e.id]: r };
    });
  }

  async function run(ids: string[] | null) {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setErr('');
    setRunning('start');
    try {
      const res = await fetch('/lab/run' + (ids ? `?ids=${ids.join(',')}` : ''), { signal: ctl.signal, cache: 'no-store' });
      if (!res.ok || !res.body) throw new Error(res.status === 404 ? 'Lab is off. Set LAB_ENABLED=true and restart.' : 'Run failed.');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim();
          buf = buf.slice(i + 1);
          if (line) apply(JSON.parse(line) as LabEvent);
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setErr((e as Error).message);
    } finally {
      setRunning(null);
    }
  }

  const done = Object.values(rows).filter((r) => r.verdict);
  const expectedOf = (id: string) => cases.find((c) => c.id === id)?.expected as DecisionResult;
  const mism = done.filter((r) => !r.verdict!.match);
  const junkPaid = done.filter((r) => expectedOf(r.id) !== 'pay' && r.verdict!.result === 'pay').length;
  const genuineHeld = done.filter((r) => expectedOf(r.id) === 'pay' && r.verdict!.result !== 'pay').length;
  const aiRows = done.filter((r) => r.ai && !r.ai.skipped);
  const disagreed = aiRows.filter((r) => r.ai!.ai && !r.ai!.ai.agreed).length;
  const avgMs = aiRows.length ? Math.round(aiRows.reduce((a, r) => a + r.ai!.ms, 0) / aiRows.length) : 0;
  const cur = rows[sel];
  const curMeta = cases.find((c) => c.id === sel);

  return (
    <div className="lab">
      <style>{css}</style>
      <div className="w">
        <h1>Validation lab</h1>
        <p className="mut">Temporary. Seeded answers go through the real code checks, the real Groq label and the real rules. Nothing is saved, no chain, no wallet.</p>
        {!hasAi && <div className="warnbox">GROQ_API_KEY or GROQ_MODEL is not set. Answers that reach the AI will come back as Review (AI failed), so the AI cases cannot be judged.</div>}
        <div className="bar">
          <button className="btn pri" disabled={!!running} onClick={() => run(null)}>Run all {cases.length}</button>
          <button className="btn" disabled={!!running || !sel} onClick={() => run([sel])}>Run selected</button>
          <button className="btn" disabled={!running} onClick={() => abort.current?.abort()}>Stop</button>
          <button className="btn" disabled={!!running} onClick={() => setRows({})}>Clear</button>
          <span className="mut">{model ? `Model: ${model}` : 'No model'} · about 2 Groq calls per case that reaches the AI</span>
        </div>
        {err && <div className="warnbox" role="alert">{err}</div>}

        <div className="sum" aria-live="polite">
          <div className="tile"><span className="mut">Run</span><b>{done.length} / {cases.length}</b></div>
          <div className="tile ok"><span className="mut">Matched expected</span><b>{done.length - mism.length}</b></div>
          <div className={'tile ' + (mism.length ? 'bad' : '')}><span className="mut">Differed</span><b>{mism.length}</b></div>
          <div className={'tile ' + (junkPaid ? 'bad' : '')}><span className="mut">Junk paid (must be 0)</span><b>{junkPaid}</b></div>
          <div className="tile"><span className="mut">Genuine held back</span><b>{genuineHeld}</b></div>
          <div className="tile"><span className="mut">AI runs disagreed</span><b>{disagreed} / {aiRows.length}</b></div>
          <div className="tile"><span className="mut">Avg AI time</span><b>{avgMs} ms</b></div>
        </div>

        <div className="grid">
          <div className="card list" role="list" aria-label="Seeded responses">
            {cases.map((c) => {
              const r = rows[c.id];
              const v = r?.verdict;
              return (
                <button key={c.id} className="item" aria-current={sel === c.id} onClick={() => setSel(c.id)}>
                  <span className="t"><b>{c.id}</b> {c.group}<small>{c.note} · expect {LABEL[c.expected]}</small></span>
                  {running === c.id && !v ? <span className="spin" aria-label="Running">◐</span>
                    : v ? <span className={'pill ' + (v.match ? tone(v.result) : 'bad')}>{LABEL[v.result]}{v.match ? '' : ' ≠'}</span>
                    : <span className="pill mut">Not run</span>}
                </button>
              );
            })}
          </div>

          <div className="card" aria-live="polite">
            {!cur?.question ? (
              <p className="mut">Select a response and press Run selected, or Run all. Each step appears as it finishes.</p>
            ) : (
              <>
                <p className="q">{cur.question}</p>
                <p className="ans">{cur.answer || <span className="mut">(empty)</span>}</p>

                <div className="step"><h3>1. Code checks</h3>
                  {!cur.signals ? <p className="mut">Running…</p> : (
                    <>
                      {cur.signals.hardFails.length === 0 && cur.signals.weak.length === 0 && <p><span className="pill ok">All clear</span></p>}
                      {cur.signals.hardFails.map((h, i) => <div className="chk" key={'h' + i}><span className="pill bad">Hard fail</span>{HARD[h.check] ?? h.check} · {h.questionId}</div>)}
                      {cur.signals.weak.map((w) => <div className="chk" key={w}><span className="pill warn">Weak signal</span>{WEAK[w] ?? w}</div>)}
                    </>
                  )}
                </div>

                <div className="step"><h3>2. AI label</h3>
                  {!cur.signals ? <p className="mut">Waiting for the code checks.</p>
                    : !cur.ai ? (cur.signals.hardFails.length ? <p className="mut">Skipped: a hard fail decides this.</p> : <p className="mut"><span className="spin">◐</span> Waiting for Groq…</p>)
                    : cur.ai.skipped ? <p className="mut">Not called (hard fail, or no open answer).</p>
                    : cur.ai.ai ? (
                      <dl className="kv">
                        <dt>Label</dt><dd>{cur.ai.ai.label}{cur.ai.ai.type ? ` · ${cur.ai.ai.type}` : ''}</dd>
                        <dt>Runs agreed</dt><dd>{cur.ai.ai.agreed ? 'Yes' : <b>No (sent to Review)</b>}</dd>
                        <dt>Injection</dt><dd>{cur.ai.ai.injection ? <b>Flagged</b> : 'No'}</dd>
                        <dt>Reason</dt><dd>{cur.ai.ai.reason}</dd>
                        <dt>Time</dt><dd>{cur.ai.ms} ms · {cur.ai.model ?? 'no model'}</dd>
                      </dl>
                    ) : <p className="mut">No AI result.</p>}
                </div>

                <div className="step" style={{ borderLeftColor: 'transparent' }}><h3>3. Rule engine</h3>
                  {!cur.verdict ? <p className="mut">Waiting…</p> : (
                    <div className={'verdict ' + tone(cur.verdict.result)}>
                      <b>{LABEL[cur.verdict.result]}</b>
                      {cur.verdict.reasons.map((r, i) => <div key={i}>{r}</div>)}
                      <div className="mut" style={{ marginTop: 6 }}>
                        Expected {curMeta ? LABEL[curMeta.expected] : ''}: {cur.verdict.match ? 'matches.' : 'DIFFERS. Check why before trusting the AI on this kind of answer.'}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
