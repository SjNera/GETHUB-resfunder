/**
 * Shared option lists for sign-up, "Your details" and (later) survey
 * targeting, so the three can never drift apart. Every choice list ends in
 * Others → "Please specify".
 */

export type Option = { value: string; label: string };

export const OTHER = "other";
export const PREFER_NOT = "prefer_not";

export const AGE_RANGES: Option[] = [
  { value: "18-20", label: "18–20" },
  { value: "21-23", label: "21–23" },
  { value: "24-26", label: "24–26" },
  { value: "27+", label: "27 or older" },
  { value: "under_18", label: "Under 18" },
];

export const SEXES: Option[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: PREFER_NOT, label: "Prefer not to say" },
  { value: OTHER, label: "Others" },
];

export const COLLEGES: Option[] = [
  { value: "arts_sciences", label: "Arts and sciences" },
  { value: "business", label: "Business" },
  { value: "computing", label: "Computing / IT" },
  { value: "education", label: "Education" },
  { value: "engineering", label: "Engineering" },
  { value: "health", label: "Health sciences" },
  { value: OTHER, label: "Others" },
];

export const YEAR_LEVELS: Option[] = [
  { value: "1", label: "1st" },
  { value: "2", label: "2nd" },
  { value: "3", label: "3rd" },
  { value: "4", label: "4th" },
  { value: "5+", label: "5th or more" },
  { value: "graduate", label: "Graduate" },
  { value: OTHER, label: "Others" },
];

export const WORKING: Option[] = [
  { value: "no", label: "No" },
  { value: "part_time", label: "Part-time" },
  { value: "full_time", label: "Full-time" },
  { value: PREFER_NOT, label: "Prefer not to say" },
];

export const FACULTY_ROLES: Option[] = [
  { value: "adviser", label: "Thesis adviser" },
  { value: "instructor", label: "Instructor" },
  { value: "panel", label: "Panel member" },
  { value: OTHER, label: "Others" },
];

/** The 17 Philippine regions (PSA), plus Prefer not to say. */
export const REGIONS: Option[] = [
  { value: "NCR", label: "NCR · Metro Manila" },
  { value: "CAR", label: "CAR · Cordillera" },
  { value: "I", label: "Region I · Ilocos" },
  { value: "II", label: "Region II · Cagayan Valley" },
  { value: "III", label: "Region III · Central Luzon" },
  { value: "IV-A", label: "Region IV-A · CALABARZON" },
  { value: "MIMAROPA", label: "MIMAROPA" },
  { value: "V", label: "Region V · Bicol" },
  { value: "VI", label: "Region VI · Western Visayas" },
  { value: "VII", label: "Region VII · Central Visayas" },
  { value: "VIII", label: "Region VIII · Eastern Visayas" },
  { value: "IX", label: "Region IX · Zamboanga Peninsula" },
  { value: "X", label: "Region X · Northern Mindanao" },
  { value: "XI", label: "Region XI · Davao" },
  { value: "XII", label: "Region XII · SOCCSKSARGEN" },
  { value: "XIII", label: "Region XIII · Caraga" },
  { value: "BARMM", label: "BARMM" },
  { value: PREFER_NOT, label: "Prefer not to say" },
];

export const PROGRAM_SUGGESTIONS = [
  "BS Psychology",
  "BS Information Technology",
  "BS Computer Science",
  "BS Accountancy",
  "BS Nursing",
  "BS Business Administration",
  "BS Civil Engineering",
  "BSEd English",
  "AB Communication",
  "AB Political Science",
];

export const labelOf = (options: Option[], value: string | undefined) => options.find((o) => o.value === value)?.label ?? "";

/* ------------------------------------------------------------------ */
/* Supported schools                                                   */
/* ------------------------------------------------------------------ */

/**
 * Demo list of supported school domains. The real check runs on the server;
 * override with NEXT_PUBLIC_SCHOOL_DOMAINS="umak.edu.ph=University of Makati,…".
 */
const DEFAULT_SCHOOLS: Record<string, string> = {
  "umak.edu.ph": "University of Makati",
  "up.edu.ph": "University of the Philippines",
  "ateneo.edu": "Ateneo de Manila University",
  "dlsu.edu.ph": "De La Salle University",
  "ust.edu.ph": "University of Santo Tomas",
  "pup.edu.ph": "Polytechnic University of the Philippines",
};

function parseSchools(raw: string | undefined): Record<string, string> {
  if (!raw) return DEFAULT_SCHOOLS;
  return Object.fromEntries(
    raw
      .split(",")
      .map((pair) => pair.split("=").map((s) => s.trim()))
      .filter(([d]) => d)
      .map(([d, name]) => [d.toLowerCase(), name || d]),
  );
}

export const SCHOOLS = parseSchools(process.env.NEXT_PUBLIC_SCHOOL_DOMAINS);

const PERSONAL = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "ymail.com", "proton.me", "protonmail.com"]);

export type EmailCheck =
  | { ok: true; email: string; domain: string; school: string }
  | { ok: false; error: string };

/** Mirrors the server's domain check; matches subdomains like student.ateneo.edu. */
export function checkSchoolEmail(input: string): EmailCheck {
  const email = input.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter your school email, like name@umak.edu.ph." };
  }
  const host = email.split("@")[1];
  if (PERSONAL.has(host)) return { ok: false, error: "Use your school email, like name@umak.edu.ph." };
  const domain = Object.keys(SCHOOLS).find((d) => host === d || host.endsWith(`.${d}`));
  if (!domain) return { ok: false, error: `${host} isn't on ResFunder yet.` };
  return { ok: true, email, domain, school: SCHOOLS[domain] };
}
