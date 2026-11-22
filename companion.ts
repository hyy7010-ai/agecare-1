// Sunrise Care Companion — added for the Cyberport AI Agent Challenge (Nov 2026).
// A resident talks with the AI; carers get a short "chat card" built only from
// what the resident said. Anything that sounds urgent goes to the nurse.
//
// Guardrails live in code, not only in the prompt:
// - Red-flag rules run on every resident message, next to the model.
//   If a rule fires, the reply is a fixed safe sentence and the nurse is alerted.
// - Every line on the chat card must quote the resident. Lines whose quote
//   is not found in the conversation are dropped.
// - Phone and ID numbers are masked before anything is sent to the model.
import type { Express } from "express";
import multer from "multer";
import { maskIdentifiers } from "./agent";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const MODEL = "gemini-3.5-flash";
const FAST = { thinkingConfig: { thinkingBudget: 0 } };

type GenerateFn = (request: any) => Promise<any>;
export type Turn = { role: "resident" | "ai"; text: string };

function parseJson(text: string): any {
  const cleaned = String(text || "").replace(/```json\n?/g, "").replace(/```/g, "").trim();
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  return JSON.parse(a >= 0 && b > a ? cleaned.slice(a, b + 1) : cleaned);
}

// ---------- deterministic red flags (what a resident might say) ----------

const RED_FLAGS: { reason: string; re: RegExp }[] = [
  {
    reason: "Chest pain or tightness",
    re: /(chest (pain|hurts|is tight|tightness)|pain in my chest|胸口(好|很|有点|有點|有啲)?(痛|疼|闷|悶|翳)|心口(好|有啲)?(痛|翳)|胸闷|胸悶|胸痛)/i,
  },
  {
    reason: "Trouble breathing",
    re: /(can'?t breathe|cannot breathe|hard to breathe|short of breath|喘不过气|喘不過氣|透不过气|透不過氣|呼吸困难|呼吸困難|唞唔到氣|抖唔到气|唞唔到气)/i,
  },
  {
    reason: "Talk of not wanting to live",
    re: /(want to die|wish i (was|were) dead|kill myself|end my life|no reason to live|不想活|唔想活|想死(?!你|去的|去嘅|咗嘅|了的)|活着没意思|活著沒意思|活着没什么意思|死咗好過|死了算了|死咗算)/i,
  },
  {
    reason: "Says they fell",
    re: /(i (just )?fell(?! in love| asleep| for)|i had a fall|i slipped|我(刚|剛|啱啱|今日|今天|昨晚|尋晚)?.{0,4}(跌倒|摔倒|摔了|跌咗|跌親|仆倒|滑倒)(?!副|個|个|支|部|隻|只|本|把|條|条|張|张|啲|嘢|东西|東西|手机|手機|眼))/i,
  },
  {
    reason: "Says someone hurt them",
    re: /((hit|hits|slapped|pushed|hurt|hurts) me|(打|推|掐|捏|闹|鬧|骂|罵)(我|咗我|了我)|有人打我|佢打我|他打我|她打我)/i,
  },
];

export function residentRedFlags(text: string): string[] {
  return RED_FLAGS.filter((f) => f.re.test(text)).map((f) => f.reason);
}

// Fixed replies used when a red flag fires. The model does not write these.
const SAFE_REPLY: Record<string, string> = {
  yue: "我聽到喇。我而家即刻通知護士過嚟睇你。你坐低唔好郁，我喺度陪住你。",
  zh: "我听到了。我现在马上通知护士过来看您。您先坐好不要动，我在这里陪着您。",
  "zh-HK": "我聽到了。我現在馬上通知護士過來看您。您先坐好不要動，我在這裡陪著您。",
  en: "I hear you. I am telling the nurse right now so they can come and see you. Please stay where you are. I am here with you.",
};

const LANGUAGE_HINTS: Record<string, string> = {
  yue: "spoken Cantonese written in Traditional Chinese, Hong Kong usage",
  zh: "Mandarin, Simplified Chinese",
  "zh-HK": "written Chinese for Hong Kong, Traditional Chinese",
  en: "English",
  tl: "Tagalog",
};

const COMPANION_SYSTEM = `You are Sunrise Care Companion, an AI that keeps an older person in a care home company.
Rules:
- You are an AI. Never say or imply you are a human, a nurse, or a family member.
- Speak warmly and simply. One or two short sentences, then at most one gentle question.
- Be curious about their life: where they grew up, work, family, food, music, daily routine. Follow what they bring up.
- Never give medical advice, never diagnose, never comment on medicines, never promise visits or outcomes.
- Do not correct their memories or argue. Do not bring up death or loss unless they do.
- If they mention pain, feeling unwell, a fall, being hurt by someone, or not wanting to live: set concern to "urgent", tell them you are letting the nurse know, and stay calm.
- If they seem low, lonely or worried (not urgent): set concern to "note".
Return JSON only: {"reply": string, "concern": "none" | "note" | "urgent", "concernReason": string}`;

export async function companionTurn(
  generate: GenerateFn,
  input: { history: Turn[]; text?: string; audio?: { data: string; mimeType: string }; language: string },
) {
  const started = Date.now();
  const language = LANGUAGE_HINTS[input.language] ? input.language : "yue";
  let said = String(input.text || "").trim();

  if (!said && input.audio) {
    const r = await generate({
      model: MODEL,
      contents: {
        parts: [
          {
            text:
              "Transcribe what this older person says, word for word, in the language spoken. " +
              'Do not translate, tidy up or add anything. Return JSON {"transcript": string}.',
          },
          { inlineData: input.audio },
        ],
      },
      config: { responseMimeType: "application/json", temperature: 0, ...FAST },
    });
    said = String(parseJson(r.text).transcript || "").trim();
  }
  if (!said) throw Object.assign(new Error("Nothing was said."), { status: 400 });

  const masked = maskIdentifiers(said);
  const ruleReasons = residentRedFlags(masked.text);

  // A red flag from the rules does not wait for the model and cannot be talked down by it.
  if (ruleReasons.length) {
    return {
      transcript: masked.text,
      maskedIdentifiers: masked.masked.length,
      reply: SAFE_REPLY[language] || SAFE_REPLY.en,
      replySource: "fixed_safe_reply",
      alert: { level: "urgent", reasons: ruleReasons, raisedBy: "rule" },
      ms: Date.now() - started,
    };
  }

  const history = (input.history || []).slice(-12).map((t) => ({
    role: t.role === "ai" ? "model" : "user",
    parts: [{ text: maskIdentifiers(String(t.text || "")).text }],
  }));
  const r = await generate({
    model: MODEL,
    contents: [...history, { role: "user", parts: [{ text: masked.text }] }],
    config: {
      systemInstruction: `${COMPANION_SYSTEM}\nReply in ${LANGUAGE_HINTS[language]}.`,
      responseMimeType: "application/json",
      temperature: 0.6,
      ...FAST,
    },
  });
  const out = parseJson(r.text);
  const urgent = out.concern === "urgent";
  return {
    transcript: masked.text,
    maskedIdentifiers: masked.masked.length,
    reply: urgent ? SAFE_REPLY[language] || SAFE_REPLY.en : String(out.reply || ""),
    replySource: urgent ? "fixed_safe_reply" : "model",
    alert:
      out.concern === "urgent" || out.concern === "note"
        ? { level: out.concern, reasons: [String(out.concernReason || "Flagged by the AI")], raisedBy: "model" }
        : null,
    ms: Date.now() - started,
  };
}

// ---------- chat card ----------

type CardItem = { text: string; quote: string };
const CARD_SECTIONS = ["likesToTalkAbout", "avoid", "habits", "tellNurse"] as const;

const norm = (s: string) => String(s || "").replace(/[\s，。！？、,.!?"'“”‘’：:；;]/g, "").toLowerCase();

// Keep only card lines whose quote really appears in what the resident said.
export function keepQuoted(items: any, residentText: string): { kept: CardItem[]; dropped: number } {
  const source = norm(residentText);
  const list: CardItem[] = Array.isArray(items) ? items : [];
  const kept = list.filter((i) => i && i.text && norm(i.quote).length >= 2 && source.includes(norm(i.quote)));
  return { kept, dropped: list.length - kept.length };
}

export async function chatCard(generate: GenerateFn, input: { history: Turn[]; carerLanguage: string }) {
  const started = Date.now();
  const residentTurns = (input.history || []).filter((t) => t.role === "resident").map((t) => maskIdentifiers(t.text).text);
  if (!residentTurns.length) throw Object.assign(new Error("No conversation yet."), { status: 400 });
  const residentText = residentTurns.join("\n");
  const carerLang = LANGUAGE_HINTS[input.carerLanguage] || LANGUAGE_HINTS.en;

  const r = await generate({
    model: MODEL,
    contents: `Below is everything an older resident said in a chat with a companion AI.
Write a short card that helps a care worker talk with this resident.
Rules:
- Use only what the resident said. No guesses, no diagnoses, no advice about treatment.
- Do not add any fact that is not in the quote. For example, do not say a person has died, is ill or lives far away unless the resident said so.
- Every item needs "quote": the resident's exact words (copied, same language) that support it.
- "text" is written in ${carerLang}, one short line.
- "tellNurse" is only for health, safety or mood worries the resident raised themselves.
- If there is nothing for a section, return an empty list.
Return JSON only:
{"mood": {"text": string, "quote": string} | null,
 "likesToTalkAbout": [{"text": string, "quote": string}],
 "avoid": [{"text": string, "quote": string}],
 "habits": [{"text": string, "quote": string}],
 "tellNurse": [{"text": string, "quote": string}]}

Resident said:
${residentText}`,
    config: { responseMimeType: "application/json", temperature: 0, ...FAST },
  });
  const out = parseJson(r.text);

  let dropped = 0;
  const card: Record<string, any> = {};
  for (const key of CARD_SECTIONS) {
    const k = keepQuoted(out[key], residentText);
    card[key] = k.kept;
    dropped += k.dropped;
  }
  const mood = keepQuoted(out.mood ? [out.mood] : [], residentText);
  card.mood = mood.kept[0] || null;
  dropped += mood.dropped;

  // Red flags found by the rules are always on the card, even if the model left them out.
  const ruleFlags = [...new Set(residentTurns.flatMap((t) => residentRedFlags(t).map((reason) => ({ reason, quote: t }))).map((x) => JSON.stringify(x)))].map(
    (x) => JSON.parse(x),
  );
  return {
    card,
    ruleFlags,
    droppedUnquoted: dropped,
    residentTurns: residentTurns.length,
    ms: Date.now() - started,
    model: MODEL,
    disclaimer: "AI summary of a conversation. Not a clinical record. A nurse must review anything under tellNurse.",
  };
}

// ---------- routes ----------

function friendly(error: any) {
  const msg = String(error?.message || "Companion failed");
  if (/429|quota|RESOURCE_EXHAUSTED/i.test(msg)) return "AI is busy (rate limit). Please try again in a moment.";
  return /api[_ ]?key|key is missing/i.test(msg) ? "AI service is not configured." : msg;
}
const parseHistory = (raw: any): Turn[] => {
  try {
    const h = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(h) ? h.filter((t) => t && (t.role === "resident" || t.role === "ai") && typeof t.text === "string").slice(-40) : [];
  } catch {
    return [];
  }
};

export function registerCompanionRoutes(app: Express, generate: GenerateFn) {
  app.post("/api/companion/turn", upload.single("audio"), async (req, res) => {
    try {
      const result = await companionTurn(generate, {
        history: parseHistory(req.body.history),
        text: req.body.text,
        language: req.body.language,
        audio: req.file
          ? {
              data: req.file.buffer.toString("base64"),
              mimeType: req.file.mimetype.includes("mp4") || req.file.mimetype.includes("m4a") ? "audio/mp4" : "audio/webm",
            }
          : undefined,
      });
      res.json({ result });
    } catch (error: any) {
      console.error("Companion turn error:", error);
      res.status(error?.status || 500).json({ error: friendly(error) });
    }
  });

  app.post("/api/companion/card", async (req, res) => {
    try {
      res.json({ result: await chatCard(generate, { history: parseHistory(req.body?.history), carerLanguage: req.body?.carerLanguage }) });
    } catch (error: any) {
      console.error("Companion card error:", error);
      res.status(error?.status || 500).json({ error: friendly(error) });
    }
  });
}
