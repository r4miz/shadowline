/**
 * The anonymous EMPLOYEE usage survey (13 questions, plain English). This is the
 * audit's primary evidence source. It follows the scoring conventions from
 * question-bank.ts: single/multi options are ordered WORST-FIRST with the safest
 * answer LAST; boolean questions are phrased so "Yes" is the safer answer.
 *
 * Stable `key`s are referenced by inventory-derive.ts and the recommendation
 * engine, so never rename a key without updating those files.
 */
import { SURVEY_TOOL_OPTIONS } from "./ai-catalog.ts";
import type { QuestionSeed } from "./question-bank";

export type EmployeeQuestionSeed = QuestionSeed & { key: string };

export const EMPLOYEE_SURVEY_DOMAIN = "How you use AI at work";

export const SIGN_IN_OPTIONS = [
  "A personal account I set up myself",
  "A mix of personal and company accounts",
  "A company-provided account",
  "I do not use AI tools for work",
] as const;

export const DATA_ENTERED_OPTIONS = [
  "Passwords, logins or security codes",
  "Customer, client or patient records",
  "Financial figures, invoices or payment details",
  "Contracts or legal documents",
  "Employee or HR information",
  "Internal emails, notes or documents",
  "Source code or technical designs",
  "Only general or public information, or nothing",
] as const;

export const CONNECTED_OPTIONS = [
  "Yes, to my work email or files",
  "Yes, to my work calendar only",
  "I am not sure",
  "No",
] as const;

export const EXTENSION_OPTIONS = [
  "Both a meeting bot and a browser extension",
  "Yes, an AI bot that joins my meetings",
  "Yes, an AI browser extension",
  "No",
] as const;

export const PAYMENT_OPTIONS = [
  "On a company card without formal approval",
  "Personally, and I expense it",
  "Personally, out of my own pocket",
  "The company set up and pays for it",
  "I do not pay for any AI tool",
] as const;

export const GUIDANCE_OPTIONS = [
  "No, nothing has been said",
  "Only informal advice from a manager or colleague",
  "Yes, there is a written policy and I have read it",
] as const;

export const FREQUENCY_OPTIONS = [
  "Every day",
  "A few times a week",
  "A few times a month",
  "Rarely or never",
] as const;

export const EMPLOYEE_SURVEY: EmployeeQuestionSeed[] = [
  {
    key: "tools_used",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "Which AI tools have you used for work in the last three months?",
    helpText: "Pick everything that applies, even if you only tried it once.",
    answerType: "multi",
    options: SURVEY_TOOL_OPTIONS,
    nistFunction: "MAP",
    owaspRefs: ["LLM02"],
    weight: 4,
  },
  {
    key: "sign_in",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "When you use AI tools for work, how do you usually sign in?",
    answerType: "single",
    options: [...SIGN_IN_OPTIONS],
    nistFunction: "MANAGE",
    owaspRefs: ["LLM02"],
    weight: 5,
  },
  {
    key: "data_entered",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "What kinds of information have you ever typed or pasted into an AI tool for work?",
    helpText: "Be honest. Your answers are anonymous and this is how the company decides what tools to provide.",
    answerType: "multi",
    options: [...DATA_ENTERED_OPTIONS],
    nistFunction: "MEASURE",
    owaspRefs: ["LLM02"],
    weight: 5,
  },
  {
    key: "frequency",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "How often do you use AI tools for work?",
    answerType: "single",
    options: [...FREQUENCY_OPTIONS],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 2,
  },
  {
    key: "tasks",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "What do you mainly use AI for?",
    answerType: "multi",
    options: [
      "Replying to customers or clients",
      "Analyzing spreadsheets or data",
      "Summarizing meetings or calls",
      "Writing emails or documents",
      "Research",
      "Writing code",
      "Creating images or marketing content",
      "I do not use AI for work",
    ],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 1,
  },
  {
    key: "guidance",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "Has anyone at work told you which AI tools are okay to use and what you can put in them?",
    answerType: "single",
    options: [...GUIDANCE_OPTIONS],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 4,
  },
  {
    key: "confident_no_sensitive",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "Are you confident you have never put sensitive company or customer information into an AI tool?",
    answerType: "boolean",
    nistFunction: "MEASURE",
    owaspRefs: ["LLM02"],
    weight: 4,
  },
  {
    key: "extensions",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "Do you use an AI browser extension, or an AI bot that joins your meetings to take notes?",
    helpText: "Examples: Otter, Fireflies or Read.ai in Zoom or Teams; AI sidebars in Chrome or Edge.",
    answerType: "single",
    options: [...EXTENSION_OPTIONS],
    nistFunction: "MAP",
    owaspRefs: ["LLM06", "LLM02"],
    weight: 4,
  },
  {
    key: "connected",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "Have you connected an AI tool to your work email, calendar or files, for example with 'Sign in with Google' or 'Sign in with Microsoft'?",
    answerType: "single",
    options: [...CONNECTED_OPTIONS],
    nistFunction: "MANAGE",
    owaspRefs: ["LLM06", "LLM02"],
    weight: 5,
  },
  {
    key: "payment",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "Do you pay for any AI tool you use for work?",
    answerType: "single",
    options: [...PAYMENT_OPTIONS],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 2,
  },
  {
    key: "would_adopt",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "If the company provided an approved AI tool and a short training, would you use it?",
    answerType: "single",
    options: ["No", "Not sure", "Yes"],
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 1,
  },
  {
    key: "role_area",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "Which area do you work in?",
    helpText: "Used only to group answers. Nothing here identifies you.",
    answerType: "single",
    options: [
      "Leadership or management",
      "Finance, HR or admin",
      "Sales, marketing or customer service",
      "Operations or delivery",
      "Technical or IT",
      "Other",
    ],
    nistFunction: "MAP",
    owaspRefs: [],
    weight: 1,
  },
  {
    key: "open_comment",
    domain: EMPLOYEE_SURVEY_DOMAIN,
    text: "Anything about AI at work you would want leadership to know?",
    helpText: "Optional. Please do not include your name or anyone else's.",
    answerType: "text",
    nistFunction: "GOVERN",
    owaspRefs: [],
    weight: 1,
  },
];

export const EMPLOYEE_QUESTION_KEYS = EMPLOYEE_SURVEY.map((q) => q.key);
