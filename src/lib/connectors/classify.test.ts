import { describe, expect, it } from "vitest";
import { classifyApp, scopeRisk } from "./classify";
import { demoWorkspace } from "./demo";

describe("classifyApp", () => {
  it("recognizes a known AI vendor with high confidence", () => {
    const c = classifyApp({ externalId: "1", name: "ChatGPT", publisher: "OpenAI", scopes: ["openid", "email"], users: ["a@x.com"] });
    expect(c.isAi).toBe(true);
    expect(c.aiConfidence).toBe("high");
    expect(c.catalogKey).toBe("chatgpt");
    expect(c.riskLevel).toBe("low");
  });

  it("flags a meeting bot with calendar + meetings access as high risk when widely used", () => {
    const c = classifyApp({ externalId: "2", name: "Read AI Meeting Notes", publisher: "Read AI", scopes: ["calendar", "onlinemeetings.read"], users: ["a", "b", "c"] });
    expect(c.catalogKey).toBe("meeting_notetaker");
    expect(c.riskLevel).toBe("high");
    expect(c.riskNotes.join(" ")).toMatch(/meetings/i);
  });

  it("treats a generic '.ai' / 'AI' name as low-confidence AI", () => {
    const c = classifyApp({ externalId: "3", name: "AI Sidebar for Chrome", publisher: null, scopes: ["gmail.readonly"], users: ["a"] });
    expect(c.isAi).toBe(true);
    expect(c.aiConfidence).toBe("low");
    expect(c.catalogKey).toBe("other_ai");
    expect(c.riskLevel).toBe("high");
    expect(c.riskNotes).toContain("Can read company email");
  });

  it("does not mark ordinary apps or first-party apps as AI", () => {
    expect(classifyApp({ externalId: "4", name: "DocuSign", publisher: "DocuSign Inc", scopes: ["openid"], users: [] }).isAi).toBe(false);
    expect(classifyApp({ externalId: "5", name: "Google Chrome", publisher: "Google", scopes: ["openid"], users: [], firstParty: true }).isAi).toBe(false);
  });

  it("does not confuse 'Mail Merge' with an AI tool but keeps its scope risk", () => {
    const c = classifyApp({ externalId: "6", name: "Mail Merge Pro", publisher: "Example", scopes: ["gmail.send", "contacts.readonly"], users: ["a"] });
    expect(c.isAi).toBe(false);
    expect(c.riskLevel).toBe("high");
    expect(c.riskNotes).toContain("Has write access, not just read");
  });
});

describe("scopeRisk", () => {
  it("ranks mail/drive above calendar above profile", () => {
    expect(scopeRisk(["https://www.googleapis.com/auth/gmail.readonly"]).level).toBe("high");
    expect(scopeRisk(["Calendars.Read"]).level).toBe("medium");
    expect(scopeRisk(["openid", "email", "profile"]).level).toBe("low");
  });
});

describe("demoWorkspace", () => {
  it("is deterministic for a seed and gains an app on later runs", () => {
    const a = demoWorkspace("seed-1", 25);
    const b = demoWorkspace("seed-1", 25);
    expect(a).toEqual(b);
    const later = demoWorkspace("seed-1", 25, 1);
    expect(later.apps.length).toBe(a.apps.length + 1);
    expect(later.users.length).toBe(a.users.length + 1);
  });
});
