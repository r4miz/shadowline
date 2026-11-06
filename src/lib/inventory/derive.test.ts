import { describe, expect, it } from "vitest";
import {
  deriveToolsFromSurvey,
  exposureForDataTypes,
  groupRespondents,
  surveyAggregates,
  type KeyedResponse,
} from "./derive";
import { DATA_ENTERED_OPTIONS, SIGN_IN_OPTIONS, CONNECTED_OPTIONS, GUIDANCE_OPTIONS } from "@/lib/employee-survey";

function respondent(token: string, answers: Record<string, string | string[] | boolean>): KeyedResponse[] {
  return Object.entries(answers).map(([questionKey, value]) => ({ questionKey, respondentToken: token, value }));
}

const responses: KeyedResponse[] = [
  ...respondent("r1", {
    tools_used: ["ChatGPT", "Grammarly"],
    sign_in: SIGN_IN_OPTIONS[0],
    data_entered: [DATA_ENTERED_OPTIONS[1]],
    connected: CONNECTED_OPTIONS[0],
    guidance: GUIDANCE_OPTIONS[0],
    would_adopt: "Yes",
    frequency: "Every day",
    role_area: "Sales, marketing or customer service",
  }),
  ...respondent("r2", {
    tools_used: ["ChatGPT", "An AI meeting note-taker (Otter, Fireflies, Fathom, Read.ai, tl;dv)"],
    sign_in: SIGN_IN_OPTIONS[2],
    data_entered: [DATA_ENTERED_OPTIONS[5]],
    connected: CONNECTED_OPTIONS[3],
    guidance: GUIDANCE_OPTIONS[1],
    would_adopt: "Not sure",
    open_comment: "Please give us an approved tool.",
  }),
  ...respondent("r3", {
    tools_used: ["None of these"],
    sign_in: SIGN_IN_OPTIONS[3],
    data_entered: [DATA_ENTERED_OPTIONS[7]],
    guidance: GUIDANCE_OPTIONS[0],
  }),
];

describe("exposureForDataTypes", () => {
  it("returns the worst level selected", () => {
    expect(exposureForDataTypes([DATA_ENTERED_OPTIONS[7]])).toBe("public");
    expect(exposureForDataTypes([DATA_ENTERED_OPTIONS[5], DATA_ENTERED_OPTIONS[0]])).toBe("confidential");
    expect(exposureForDataTypes([DATA_ENTERED_OPTIONS[5], DATA_ENTERED_OPTIONS[2]])).toBe("regulated");
    expect(exposureForDataTypes(["unknown option"])).toBe("public");
  });
});

describe("groupRespondents + deriveToolsFromSurvey", () => {
  it("groups by token and maps labels to catalog entries", () => {
    const records = groupRespondents(responses);
    expect(records).toHaveLength(3);
    const r1 = records.find((r) => r.token === "r1")!;
    expect(r1.tools.map((t) => t.key)).toEqual(["chatgpt", "grammarly"]);
    expect(records.find((r) => r.token === "r3")!.tools).toHaveLength(0);
  });

  it("builds an inventory with counts, worst exposure and account type", () => {
    const tools = deriveToolsFromSurvey(groupRespondents(responses));
    const chat = tools.find((t) => t.catalogKey === "chatgpt")!;
    expect(chat.reportedBy).toBe(2);
    expect(chat.personalUsers).toBe(1);
    expect(chat.accessMethod).toBe("personal_account");
    expect(chat.dataExposureLevel).toBe("regulated");
    const notes = tools.find((t) => t.catalogKey === "meeting_notetaker")!;
    expect(notes.accessMethod).toBe("browser_ext");
    expect(notes.notes).toMatch(/record/i);
    expect(tools[0].catalogKey).toBe("chatgpt"); // most reported first
  });
});

describe("surveyAggregates", () => {
  it("computes shares for the report and recommendation", () => {
    const agg = surveyAggregates(groupRespondents(responses));
    expect(agg.respondentCount).toBe(3);
    expect(agg.aiUsers).toBe(2);
    expect(agg.toolUsage.chatgpt).toBe(2);
    expect(agg.personalAccountShare).toBeCloseTo(1 / 3);
    expect(agg.regulatedDataShare).toBeCloseTo(1 / 3);
    expect(agg.sensitiveDataShare).toBeCloseTo(2 / 3);
    expect(agg.connectedShare).toBeCloseTo(1 / 3);
    expect(agg.noGuidanceShare).toBeCloseTo(2 / 3);
    expect(agg.adoptionAppetite).toBeCloseTo(1 / 3);
    expect(agg.dailyUsers).toBe(1);
    expect(agg.comments).toEqual(["Please give us an approved tool."]);
    expect(agg.roles["Sales, marketing or customer service"]).toBe(1);
  });
});
