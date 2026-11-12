/**
 * The hardcoded survey for the first core-loop test. The builder comes back
 * once the loop (fund → answer → pay → close → log) works end to end.
 */
import type { Question, Survey } from "../types";

export const DEMO_SURVEY_ID = "sleep-study";
export const DEMO_RESEARCHER = "Thesis Group 7 · BS Psychology";

export const sleepQuestions: Question[] = [
  {
    id: "q-year",
    type: "multiple_choice",
    title: "What year level are you in?",
    required: true,
    options: ["1st year", "2nd year", "3rd year", "4th year"],
  },
  {
    id: "q-hours",
    type: "multiple_choice",
    title: "On school nights, how many hours do you usually sleep?",
    required: true,
    options: ["Less than 5 hours", "5–6 hours", "7–8 hours", "More than 8 hours"],
  },
  {
    id: "q-phone",
    type: "linear_scale",
    title: "I use my phone in bed before sleeping.",
    required: true,
    minLabel: "Never",
    maxLabel: "Every night",
  },
  {
    id: "q-late",
    type: "linear_scale",
    title: "I stay up late to finish school requirements.",
    required: true,
    minLabel: "Never",
    maxLabel: "Every night",
  },
  {
    id: "q-rested",
    type: "linear_scale",
    title: "I feel rested during morning classes.",
    required: true,
    minLabel: "Never",
    maxLabel: "Always",
  },
  {
    id: "q-grades",
    type: "linear_scale",
    title: "My grades suffer in weeks when I sleep less.",
    required: true,
    minLabel: "Strongly disagree",
    maxLabel: "Strongly agree",
  },
  {
    id: "q-nap",
    type: "linear_scale",
    title: "I nap during the day to catch up on sleep.",
    required: true,
    minLabel: "Never",
    maxLabel: "Every day",
  },
  {
    id: "q-devices",
    type: "checkboxes",
    title: "Which do you use in the hour before you sleep?",
    required: false,
    options: ["Phone", "Laptop", "Tablet", "TV", "None of these"],
  },
  {
    id: "q-why",
    type: "paragraph",
    title: "What usually keeps you up late on school nights?",
    description: "A sentence or two is enough. English, Filipino or Taglish are all fine.",
    required: true,
    allowShort: false,
  },
  {
    id: "q-else",
    type: "short_answer",
    title: "Anything else you'd like the researchers to know?",
    required: false,
    allowShort: true,
  },
];

/** ₱10 per valid response, in mock-token units (18 decimals). */
export const DEMO_RATE_UNITS = "10000000000000000000";
export const DEMO_QUOTA = 150;

/** Starts unfunded so the core loop begins at "Fund". */
export function hardcodedSurvey(now = Date.now()): Survey {
  return {
    id: DEMO_SURVEY_ID,
    title: "Sleep, screen time and study habits of college students",
    description:
      "We're a BS Psychology thesis group studying how late-night screen use relates to sleep and grades. Takes about 4 minutes. Your answers stay anonymous.",
    researcher: DEMO_RESEARCHER,
    institution: "University of Makati",
    questions: sleepQuestions,
    status: "draft",
    rateUnits: DEMO_RATE_UNITS,
    quota: DEMO_QUOTA,
    deadline: new Date(now + 7 * 24 * 3600_000).toISOString(),
    estimatedMinutes: 4,
    createdAt: new Date(now).toISOString(),
  };
}
