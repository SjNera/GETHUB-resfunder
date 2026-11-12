import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice" };

const rows = [
  ["Email", "Contact by the survey's researcher, and the one-response-per-survey check (as a keyed hash)", "Off-chain"],
  ["Wallet address", "Receiving payments and funding surveys", "On-chain with each payment or block"],
  ["Survey answers", "Screening (sent to a third-party AI model, Groq) and the researcher's results", "Off-chain"],
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="eyebrow">Privacy notice · privacy-v1</p>
      <h1 className="display mt-3 text-[clamp(2.25rem,6vw,3.5rem)]">What we keep, and why</h1>
      <p className="mt-5 max-w-[65ch] text-lg text-muted">
        ResFunder follows the Data Privacy Act of 2012 (RA 10173). We ask only for a wallet, an email and your answers: no
        name, birthday, student number or phone number. Your email is shown only to the researcher of the survey you answer.
      </p>
      <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-surface">
        <table className="w-full text-left text-[15px]">
          <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Used for</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">Where it lives</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([d, use, where]) => (
              <tr key={d} className="border-b border-border last:border-0 align-top">
                <td className="px-5 py-4 font-medium">{d}</td>
                <td className="px-5 py-4 text-muted">
                  {use}
                  <span className="mt-1 block sm:hidden">{where}</span>
                </td>
                <td className="hidden px-5 py-4 text-muted sm:table-cell">{where}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-8 max-w-[65ch] text-muted">
        Answers and emails never go on-chain. Only hashes, wallet addresses and amounts do, and records already on the
        blockchain can&apos;t be removed.
      </p>
    </article>
  );
}
