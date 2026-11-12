import type { SurveyJson } from "@/lib/types";

/** Read-only view of what respondents will see, built from the same survey JSON. */
export function SurveyPreview({ survey }: { survey: SurveyJson }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5" data-testid="preview">
      <h3 className="text-lg font-semibold">{survey.title || "Untitled survey"}</h3>
      {survey.description && <p className="mt-1 text-sm text-muted">{survey.description}</p>}
      <ol className="mt-4 grid gap-5">
        {survey.questions.map((q, i) => (
          <li key={q.id}>
            <p className="text-[15px] font-medium">
              {i + 1}. {q.text || <span className="text-subtle">Untitled question</span>}
              {q.required && <span className="text-dontpay"> *</span>}
            </p>
            {q.type === "multiple_choice" && (
              <div className="mt-2 grid gap-1.5">
                {q.options.map((o, j) => (
                  <label key={j} className="flex items-center gap-2 text-sm"><input type="radio" disabled />{o || <span className="text-subtle">Option</span>}</label>
                ))}
              </div>
            )}
            {q.type === "scale" && Number.isInteger(q.min) && Number.isInteger(q.max) && q.min < q.max && q.max - q.min <= 20 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Array.from({ length: q.max - q.min + 1 }, (_, k) => q.min + k).map((n) => (
                  <span key={n} className="grid size-9 place-items-center rounded-full border border-border-strong text-sm">{n}</span>
                ))}
              </div>
            )}
            {q.type === "open_ended" && <div className="mt-2 h-16 rounded-xl border border-dashed border-border-strong" />}
          </li>
        ))}
      </ol>
    </div>
  );
}
