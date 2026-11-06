import { describe, expect, it } from "vitest";
import { AI_CATALOG, matchAppToCatalog, matchMerchantToCatalog, SURVEY_TOOL_OPTIONS, SURVEY_TOOL_NONE } from "./ai-catalog";
import { EMPLOYEE_SURVEY } from "./employee-survey";

describe("AI catalog", () => {
  it("has unique keys and a safe sentinel last in the survey options", () => {
    const keys = AI_CATALOG.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(SURVEY_TOOL_OPTIONS.at(-1)).toBe(SURVEY_TOOL_NONE);
  });
  it("matches merchants and app names, specific before generic", () => {
    expect(matchMerchantToCatalog("OPENAI *CHATGPT SUBSCR")?.key).toBe("chatgpt");
    expect(matchMerchantToCatalog("OTTER.AI PRO")?.key).toBe("meeting_notetaker");
    expect(matchMerchantToCatalog("STAPLES")).toBeUndefined();
    expect(matchAppToCatalog("GitHub Copilot", "GitHub")?.key).toBe("github_copilot");
    expect(matchAppToCatalog("Microsoft Copilot", "Microsoft")?.key).toBe("copilot_m365");
    expect(matchAppToCatalog("Some AI Thing", null)?.key).toBe("other_ai");
    expect(matchAppToCatalog("Slack", "Slack")).toBeUndefined();
  });
});

describe("employee survey conventions", () => {
  it("has unique keys and safe-last option ordering where it matters", () => {
    const keys = EMPLOYEE_SURVEY.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
    const signIn = EMPLOYEE_SURVEY.find((q) => q.key === "sign_in")!;
    expect(signIn.options?.at(-1)).toMatch(/do not use/i);
    const data = EMPLOYEE_SURVEY.find((q) => q.key === "data_entered")!;
    expect(data.options?.at(-1)).toMatch(/general or public/i);
    const guidance = EMPLOYEE_SURVEY.find((q) => q.key === "guidance")!;
    expect(guidance.options?.at(-1)).toMatch(/written policy/i);
  });
  it("contains no em dashes", () => {
    const text = JSON.stringify(EMPLOYEE_SURVEY);
    expect(text.includes("\u2014")).toBe(false);
  });
});
