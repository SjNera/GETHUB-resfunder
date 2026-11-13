// TEMPORARY validation lab. Delete with app/lab and lib/lab.
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { LAB_CASES } from '@/lib/lab/cases';
import { labEnabled } from '@/lib/lab/run';
import { LabClient } from './lab-client';

export default async function LabPage() {
  await connection();
  if (!labEnabled()) notFound();
  const cases = LAB_CASES.map((c) => ({ id: c.id, group: c.group, note: c.note, expected: c.expected }));
  const hasAi = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_MODEL);
  return <LabClient cases={cases} hasAi={hasAi} model={process.env.GROQ_MODEL ?? null} />;
}
