// Sunrise Care Handover — added for the Cyberport AI Agent Challenge (Nov 2026).
// At the end of a shift the agent turns everything recorded during the shift
// (progress notes, incident decisions, nurse alerts, chat cards) into one handover sheet.
//
// Guardrails in code:
// - "Must see first" is built by rules from the shift log, not by the model.
//   Urgent alerts, must-report incidents and anything still waiting for a nurse always appear.
// - Every line the model writes must cite the log entries it came from.
//   Lines that cite nothing, or cite an entry that does not exist, are dropped.
// - Phone and ID numbers are masked before anything is sent to the model.
import type { Express } from "express";
import { maskIdentifiers } from "./agent";

const MODEL = "gemini-3.5-flash";
const FAST = { thinkingConfig: { thinkingBudget: 0 } };
type GenerateFn = (request: any) => Promise<any>;

export type ShiftEntry = {
  id: string;
  at: string;
  kind: "note" | "alert" | "card";
  resident?: string;
  text: string;
  urgent?: boolean; // urgent alert, or must-report incident
  pending?: boolean; // still waiting for a nurse
  status?: string;
};
type Line = { text: string; sources: string[] };

const LANG: Record<string, string> = {
  en: "English",
  zh: "Simplified Chinese",
  "zh-HK": "Traditional Chinese (Hong Kong usage)",
  tl: "Tagalog",
};

function parseJson(text: string): any {
  const cleaned = String(text || "").replace(/```json\n?/g, "").replace(/```/g, "").trim();
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  return JSON.parse(a >= 0 && b > a ? cleaned.slice(a, b + 1) : cleaned);
}

export function cleanEntries(raw: any): ShiftEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && typeof e.text === "string" && e.text.trim() && ["note", "alert", "card"].includes(e.kind))
    .slice(-60)
    .map((e, i) => ({
      id: String(e.id || `E${i + 1}`).slice(0, 24),
      at: String(e.at || "").slice(0, 40),
      kind: e.kind,
      resident: e.resident ? maskIdentifiers(String(e.resident)).text.slice(0, 40) : undefined,
      text: maskIdentifiers(String(e.text)).text.slice(0, 1500),
      urgent: !!e.urgent,
      pending: !!e.pending,
      status: e.status ? String(e.status).slice(0, 80) : undefined,
    }));
}

// Built by rules only. The model cannot remove or reword these.
export function mustSeeFirst(entries: ShiftEntry[]) {
  return entries
    .filter((e) => e.urgent || e.pending)
    .map((e) => ({
      id: e.id,
      at: e.at,
      resident: e.resident,
      why: e.urgent && e.pending ? "urgent_and_waiting" : e.urgent ? "urgent" : "waiting_for_nurse",
      text: e.text,
      status: e.status,
    }));
}

// Keep only lines that cite at least one real entry.
export function keepSourced(lines: any, ids: Set<string>): { kept: Line[]; dropped: number } {
  const list: any[] = Array.isArray(lines) ? lines : [];
  const kept: Line[] = [];
  for (const l of list) {
    const sources = Array.isArray(l?.sources) ? l.sources.map(String).filter((s: string) => ids.has(s)) : [];
    if (l?.text && sources.length) kept.push({ text: String(l.text), sources });
  }
  return { kept, dropped: list.length - kept.length };
}

export async function buildHandover(generate: GenerateFn, input: { entries: any; language?: string }) {
  const started = Date.now();
  const entries = cleanEntries(input.entries);
  if (!entries.length) throw Object.assign(new Error("The shift log is empty."), { status: 400 });
  const ids = new Set(entries.map((e) => e.id));
  const language = LANG[input.language || ""] || LANG.en;

  const r = await generate({
    model: MODEL,
    contents: `You are writing a shift handover sheet for the next care worker in an aged care home.
Below is this shift's log. Each entry has an id.
Rules:
- Use only what is in the log. No guesses, no diagnoses, no advice about treatment or medicines.
- Group by resident. Use the resident's name exactly as it appears. If an entry has no resident, use "Unnamed resident".
- Every line needs "sources": the ids of the entries it is based on.
- "happened": what happened this shift, short factual lines.
- "followUp": things the next shift needs to do or watch, only if the log says so.
- "howToTalk": tips from chat cards (what they like to talk about, what to avoid, habits).
- Write "text" in ${language}. One short line each. Leave a list empty if there is nothing.
Return JSON only:
{"residents": [{"name": string, "happened": [{"text": string, "sources": [string]}], "followUp": [{"text": string, "sources": [string]}], "howToTalk": [{"text": string, "sources": [string]}]}]}

Shift log:
${entries.map((e) => `[${e.id}] ${e.at} | ${e.kind}${e.resident ? ` | resident: ${e.resident}` : ""}${e.status ? ` | status: ${e.status}` : ""}${e.urgent ? " | URGENT" : ""}${e.pending ? " | WAITING FOR NURSE" : ""}\n${e.text}`).join("\n\n")}`,
    config: { responseMimeType: "application/json", temperature: 0, ...FAST },
  });
  const out = parseJson(r.text);

  let dropped = 0;
  const residents = (Array.isArray(out.residents) ? out.residents : [])
    .map((res: any) => {
      const sec: Record<string, Line[]> = {};
      for (const key of ["happened", "followUp", "howToTalk"]) {
        const k = keepSourced(res?.[key], ids);
        sec[key] = k.kept;
        dropped += k.dropped;
      }
      return { name: String(res?.name || "Unnamed resident").slice(0, 40), ...sec };
    })
    .filter((res: any) => res.happened.length || res.followUp.length || res.howToTalk.length);

  return {
    mustSeeFirst: mustSeeFirst(entries),
    residents,
    droppedUnsourced: dropped,
    entriesUsed: entries.length,
    ms: Date.now() - started,
    model: MODEL,
    disclaimer: "AI summary of this shift's log. Not a clinical record. Check the source entries before acting.",
  };
}

export function registerHandoverRoutes(app: Express, generate: GenerateFn) {
  app.post("/api/handover", async (req, res) => {
    try {
      res.json({ result: await buildHandover(generate, { entries: req.body?.entries, language: req.body?.language }) });
    } catch (error: any) {
      console.error("Handover error:", error);
      const msg = String(error?.message || "Handover failed");
      res.status(error?.status || 500).json({ error: /429|quota|RESOURCE_EXHAUSTED/i.test(msg) ? "AI is busy (rate limit). Please try again in a moment." : msg });
    }
  });
}
