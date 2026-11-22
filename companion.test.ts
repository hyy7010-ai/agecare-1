import { describe, it, expect } from "vitest";
import { residentRedFlags, keepQuoted, companionTurn, chatCard } from "./companion";

describe("resident red flags", () => {
  it("flags chest pain in Cantonese, Mandarin and English", () => {
    expect(residentRedFlags("我心口好痛")).toContain("Chest pain or tightness");
    expect(residentRedFlags("今天胸口有点闷")).toContain("Chest pain or tightness");
    expect(residentRedFlags("My chest hurts")).toContain("Chest pain or tightness");
  });
  it("flags talk of not wanting to live", () => {
    expect(residentRedFlags("我唔想活喇")).toContain("Talk of not wanting to live");
    expect(residentRedFlags("活着没意思")).toContain("Talk of not wanting to live");
  });
  it("flags a fall and being hurt", () => {
    expect(residentRedFlags("我啱啱跌咗")).toContain("Says they fell");
    expect(residentRedFlags("佢打我")).toContain("Says someone hurt them");
  });
  it("does not flag ordinary talk", () => {
    expect(residentRedFlags("我以前喺茶樓做點心，個孫女喺英國讀書")).toEqual([]);
    expect(residentRedFlags("我想食蛋撻")).toEqual([]);
    expect(residentRedFlags("I fell in love with dancing when I was young")).toEqual([]);
    expect(residentRedFlags("我好想死去的老伴")).toEqual([]);
    expect(residentRedFlags("我跌咗副眼鏡，搵唔返。")).toEqual([]);
    expect(residentRedFlags("我啱啱喺廁所跌咗。")).toContain("Says they fell");
    expect(residentRedFlags("I fell in the bathroom")).toContain("Says they fell");
  });
});

describe("chat card quotes", () => {
  it("drops lines that do not quote the resident", () => {
    const r = keepQuoted(
      [
        { text: "Worked making dim sum", quote: "喺茶樓做點心" },
        { text: "Has diabetes", quote: "我有糖尿病" },
        { text: "No quote", quote: "" },
      ],
      "我以前喺茶樓做點心。",
    );
    expect(r.kept.map((k) => k.text)).toEqual(["Worked making dim sum"]);
    expect(r.dropped).toBe(2);
  });
});

describe("guardrails do not depend on the model", () => {
  const neverCalled = async () => {
    throw new Error("model should not be called");
  };
  it("uses the fixed safe reply and alerts when a rule fires", async () => {
    const r = await companionTurn(neverCalled, { history: [], text: "我心口好痛", language: "yue" });
    expect(r.replySource).toBe("fixed_safe_reply");
    expect(r.alert).toMatchObject({ level: "urgent", raisedBy: "rule" });
    expect(r.reply).toContain("護士");
  });
  it("replaces the model's reply when the model itself says urgent", async () => {
    const model = async () => ({ text: JSON.stringify({ reply: "Take some paracetamol.", concern: "urgent", concernReason: "Feels very unwell" }) });
    const r = await companionTurn(model, { history: [], text: "I feel terrible today", language: "en" });
    expect(r.reply).not.toContain("paracetamol");
    expect(r.alert?.raisedBy).toBe("model");
  });
  it("puts rule flags on the card even if the model leaves them out", async () => {
    const model = async () => ({ text: JSON.stringify({ mood: null, likesToTalkAbout: [], avoid: [], habits: [], tellNurse: [] }) });
    const r = await chatCard(model, { history: [{ role: "resident", text: "今天胸口有点闷" }], carerLanguage: "en" });
    expect(r.ruleFlags[0].reason).toBe("Chest pain or tightness");
  });
});
