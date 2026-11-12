"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import {
  AGE_RANGES,
  COLLEGES,
  FACULTY_ROLES,
  PROGRAM_SUGGESTIONS,
  REGIONS,
  SEXES,
  WORKING,
  YEAR_LEVELS,
} from "@/lib/ui/auth/options";
import type { FacultyProfile, StudentProfile } from "@/lib/ui/auth/store";
import { Checkbox, choiceError, FieldError, FieldLabel, Helper, Pills, Select, TextInput, ValuePills } from "./fields";

const PREFER_HELP = "Surveys that need this won't be shown to you if you prefer not to say.";

export type Consent = { privacy: boolean; researchers: boolean };

/* ---------------- validation (run on Continue, never while typing) ---------------- */

export function aboutErrors(p: StudentProfile) {
  return {
    ageRange: p.ageRange ? undefined : "Pick your age range.",
    sex: choiceError(p.sex, "Pick one, or Prefer not to say."),
  };
}

export function schoolErrors(p: StudentProfile) {
  return {
    college: choiceError(p.college, "Pick your college."),
    program: p.program?.trim() ? undefined : "Enter your program or course.",
    yearLevel: choiceError(p.yearLevel, "Pick your year level."),
  };
}

export function whereErrors(p: StudentProfile) {
  return {
    region: p.region ? undefined : "Pick your region, or Prefer not to say.",
    working: p.working ? undefined : "Pick one, or Prefer not to say.",
  };
}

export function facultyErrors(p: FacultyProfile) {
  return {
    department: choiceError(p.department, "Pick your department."),
    facultyRole: choiceError(p.facultyRole, "Pick your role."),
  };
}

export const hasErrors = (e: Record<string, string | undefined>) => Object.values(e).some(Boolean);

/* ---------------- step bodies ---------------- */

type StudentProps = { value: StudentProfile; onChange: (p: StudentProfile) => void; showErrors: boolean };

export function AboutFields({ value, onChange, showErrors }: StudentProps) {
  const e = showErrors ? aboutErrors(value) : ({} as Partial<ReturnType<typeof aboutErrors>>);
  return (
    <div className="flex flex-col gap-7">
      <ValuePills label="Age range" options={AGE_RANGES} value={value.ageRange} onChange={(ageRange) => onChange({ ...value, ageRange })} error={e.ageRange} />
      <Pills label="Sex" options={SEXES} value={value.sex} onChange={(sex) => onChange({ ...value, sex })} error={e.sex} helper={PREFER_HELP} />
    </div>
  );
}

export function SchoolFields({ value, onChange, showErrors, school, onChangeEmail }: StudentProps & { school: string; onChangeEmail?: () => void }) {
  const e = showErrors ? schoolErrors(value) : ({} as Partial<ReturnType<typeof schoolErrors>>);
  const id = useId();
  return (
    <div className="flex flex-col gap-7">
      <div>
        <FieldLabel htmlFor={`${id}-school`}>School</FieldLabel>
        <div className="relative">
          <TextInput id={`${id}-school`} value={school} disabled readOnly className="pr-11" />
          <Lock aria-hidden className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
        </div>
        <Helper>
          From your email.{" "}
          {onChangeEmail ? (
            <button type="button" onClick={onChangeEmail} className="font-medium text-brand-ink [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
              Not your school? Change email
            </button>
          ) : null}
        </Helper>
      </div>
      <Pills label="College" options={COLLEGES} value={value.college} onChange={(college) => onChange({ ...value, college })} error={e.college} />
      <div>
        <FieldLabel htmlFor={`${id}-program`}>Program or course</FieldLabel>
        <TextInput
          id={`${id}-program`}
          list={`${id}-programs`}
          autoComplete="off"
          placeholder="e.g. BS Psychology"
          value={value.program ?? ""}
          onChange={(ev) => onChange({ ...value, program: ev.target.value })}
          aria-invalid={!!e.program}
        />
        <datalist id={`${id}-programs`}>
          {PROGRAM_SUGGESTIONS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <FieldError>{e.program}</FieldError>
      </div>
      <Pills label="Year level" options={YEAR_LEVELS} value={value.yearLevel} onChange={(yearLevel) => onChange({ ...value, yearLevel })} error={e.yearLevel} />
    </div>
  );
}

export function WhereFields({ value, onChange, showErrors }: StudentProps) {
  const e = showErrors ? whereErrors(value) : ({} as Partial<ReturnType<typeof whereErrors>>);
  const id = useId();
  return (
    <div className="flex flex-col gap-7">
      <div>
        <FieldLabel htmlFor={`${id}-region`}>Region</FieldLabel>
        <Select
          id={`${id}-region`}
          options={REGIONS}
          placeholder="Choose your region"
          value={value.region ?? ""}
          onChange={(ev) => onChange({ ...value, region: ev.target.value })}
          aria-invalid={!!e.region}
        />
        <FieldError>{e.region}</FieldError>
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-city`} optional>
          City or municipality
        </FieldLabel>
        <TextInput id={`${id}-city`} autoComplete="address-level2" value={value.city ?? ""} onChange={(ev) => onChange({ ...value, city: ev.target.value })} />
      </div>
      <ValuePills label="Working student" options={WORKING} value={value.working} onChange={(working) => onChange({ ...value, working })} error={e.working} helper={PREFER_HELP} />
    </div>
  );
}

export function FacultyFields({ value, onChange, showErrors }: { value: FacultyProfile; onChange: (p: FacultyProfile) => void; showErrors: boolean }) {
  const e = showErrors ? facultyErrors(value) : ({} as Partial<ReturnType<typeof facultyErrors>>);
  return (
    <div className="flex flex-col gap-7">
      <Pills label="Department" options={COLLEGES} value={value.department} onChange={(department) => onChange({ ...value, department })} error={e.department} />
      <Pills label="Role" options={FACULTY_ROLES} value={value.facultyRole} onChange={(facultyRole) => onChange({ ...value, facultyRole })} error={e.facultyRole} />
    </div>
  );
}

export function ConsentFields({ value, onChange, student, showErrors }: { value: Consent; onChange: (c: Consent) => void; student: boolean; showErrors: boolean }) {
  const missing = showErrors && (!value.privacy || (student && !value.researchers));
  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5">
      <Checkbox checked={value.privacy} onChange={(privacy) => onChange({ ...value, privacy })}>
        I&apos;ve read the{" "}
        <Link href="/privacy" target="_blank" className="font-medium text-brand-ink [@media(hover:hover)_and_(pointer:fine)]:hover:underline">
          privacy notice
        </Link>
        . ResFunder keeps my email and details off-chain. Only my wallet address and payment records go on the blockchain.
      </Checkbox>
      {student ? (
        <Checkbox checked={value.researchers} onChange={(researchers) => onChange({ ...value, researchers })}>
          Researchers see my details only alongside my answers, never my name or email. I can edit or delete them anytime.
        </Checkbox>
      ) : null}
      <FieldError>{missing ? "Tick both boxes to finish setup." : undefined}</FieldError>
    </div>
  );
}
