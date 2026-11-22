import { describe, it, expect } from "vitest";
import { buildHandover, keepSourced, mustSeeFirst, cleanEntries } from "./handover";

const log = [
  { id: "N1", at: "07:10", kind: "note", resident: "王奶奶", text: "Fall in bathroom, struck head.", pending: true, status: "RN must check" },
  { id: "A1", at: "10:02", kind: "alert", resident: "陳婆婆", text: "呢兩日心口有啲翳。", urgent: true, status: "not acknowledged" },
  { id: "C1", at: "10:05", kind: "card", resident: "陳婆婆", text: "Likes: dim sum work. Avoid: husband." },
  { id: "N2", at: "12:30", kind: "note", resident: "陳伯", text: "Ate half a bowl of congee.", status: "RN approved" },
];

describe("handover guardrails", () => {
  it("lists urgent and waiting items by rule", () => {
    const m = mustSeeFirst(cleanEntries(log));
    expect(m.map((x) => x.id)).toEqual(["N1", "A1"]);
  });
  it("drops lines with no real source", () => {
    const r = keepSourced(
      [{ text: "ok", sources: ["N2"] }, { text: "made up", sources: ["X9"] }, { text: "no source", sources: [] }],
      new Set(["N2"]),
    );
    expect(r.kept.map((k) => k.text)).toEqual(["ok"]);
    expect(r.dropped).toBe(2);
  });
  it("keeps must-see items even when the model returns nothing", async () => {
    const model = async () => ({ text: JSON.stringify({ residents: [] }) });
    const r = await buildHandover(model, { entries: log, language: "en" });
    expect(r.mustSeeFirst).toHaveLength(2);
    expect(r.residents).toEqual([]);
  });
  it("removes invented lines from the model output", async () => {
    const model = async () => ({
      text: JSON.stringify({
        residents: [{ name: "陳伯", happened: [{ text: "Ate half a bowl of congee", sources: ["N2"] }, { text: "Has diabetes", sources: [] }], followUp: [], howToTalk: [] }],
      }),
    });
    const r = await buildHandover(model, { entries: log, language: "en" });
    expect(r.residents[0].happened.map((l: any) => l.text)).toEqual(["Ate half a bowl of congee"]);
    expect(r.droppedUnsourced).toBe(1);
  });
  it("masks phone numbers before the model sees them", async () => {
    let seen = "";
    const model = async (req: any) => { seen = req.contents; return { text: JSON.stringify({ residents: [] }) }; };
    await buildHandover(model, { entries: [{ id: "N1", kind: "note", text: "Daughter called from 0412 345 678." }] });
    expect(seen).not.toContain("0412");
  });
});
