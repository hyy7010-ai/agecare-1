// Sunrise Care Companion — added for the Cyberport AI Agent Challenge (Nov 2026).
// Public demo page at /companion. Left: what the resident sees. Right: what staff see.
// Uses fictional sample lines only.
import React, { useEffect, useRef, useState } from "react";
import { Heart, Mic, Square, Send, ShieldAlert, ShieldCheck, Loader2, Volume2, VolumeX, ClipboardList, Quote, Bot } from "lucide-react";

type Turn = { role: "resident" | "ai"; text: string; fixed?: boolean };
type Alert = { at: string; level: "urgent" | "note"; reasons: string[]; raisedBy: "rule" | "model"; quote: string; ackBy?: string };
type Item = { text: string; quote: string };
type Card = {
  card: { mood: Item | null; likesToTalkAbout: Item[]; avoid: Item[]; habits: Item[]; tellNurse: Item[] };
  ruleFlags: { reason: string; quote: string }[];
  droppedUnquoted: number; residentTurns: number; ms: number; disclaimer: string;
};

const LANGS = [
  { code: "yue", label: "粵語" },
  { code: "zh", label: "普通话" },
  { code: "en", label: "English" },
];
const CARER_LANGS = [
  { code: "en", label: "English" },
  { code: "zh", label: "简体中文" },
  { code: "zh-HK", label: "繁體中文" },
  { code: "tl", label: "Tagalog" },
];

// Fictional lines written for the demo. Not a real resident.
const SAMPLES: Record<string, string[]> = {
  yue: [
    "我以前喺茶樓做點心，做咗三十年。",
    "個孫女喺英國讀書，好耐冇見喇。",
    "我鍾意朝早飲杯熱水，食完晏想坐喺窗邊。",
    "唔好同我講我老公，講起我會好唔開心。",
    "呢兩日心口有啲翳。",
  ],
  zh: [
    "我年轻的时候在纺织厂上班，做了二十多年。",
    "我最喜欢听邓丽君的歌。",
    "晚上总是睡不好，三四点就醒了。",
    "今天胸口有点闷。",
  ],
  en: [
    "I used to be a tram driver for thirty years.",
    "My daughter lives far away. I miss her.",
    "I like a cup of tea by the window after lunch.",
    "My chest hurts a little today.",
  ],
};

const HELLO: Record<string, string> = {
  yue: "你好呀，我係晨曦，一個 AI 陪伴助手，唔係真人。今日想同我傾啲乜嘢呀？",
  zh: "您好，我是晨曦，一个 AI 陪伴助手，不是真人。今天想和我聊点什么呢？",
  en: "Hello, I am Sunrise, an AI companion, not a real person. What would you like to talk about today?",
};

const SECTIONS: { key: keyof Card["card"]; label: string }[] = [
  { key: "likesToTalkAbout", label: "喜欢聊的 Likes to talk about" },
  { key: "avoid", label: "不要提的 Avoid" },
  { key: "habits", label: "生活习惯 Habits" },
  { key: "tellNurse", label: "要告诉护士的 Tell the nurse" },
];

export function CompanionChat() {
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [language, setLanguage] = useState("yue");
  const [carerLanguage, setCarerLanguage] = useState("en");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [speak, setSpeak] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [nurse, setNurse] = useState("");
  const [card, setCard] = useState<Card | null>(null);
  const [cardBusy, setCardBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [turns, busy]);

  const say = async (line: string) => {
    if (!speak) return;
    try {
      const r = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: line }) });
      if (!r.ok) throw new Error("tts");
      await new Audio(URL.createObjectURL(await r.blob())).play();
    } catch {
      try {
        const u = new SpeechSynthesisUtterance(line);
        u.lang = language === "yue" ? "zh-HK" : language === "zh" ? "zh-CN" : "en-AU";
        window.speechSynthesis.speak(u);
      } catch { /* no voice available: the text is still on screen */ }
    }
  };

  const begin = () => {
    setStarted(true);
    setTurns([{ role: "ai", text: HELLO[language], fixed: true }]);
    say(HELLO[language]);
  };

  const send = async (line: string, audio?: Blob) => {
    if (busy || (!line.trim() && !audio)) return;
    setBusy(true); setError(""); setCard(null);
    const history = turns;
    if (line.trim()) setTurns((t) => [...t, { role: "resident", text: line.trim() }]);
    setText("");
    try {
      const fd = new FormData();
      fd.append("language", language);
      fd.append("history", JSON.stringify(history.map(({ role, text }) => ({ role, text }))));
      if (audio) fd.append("audio", audio, "resident.webm"); else fd.append("text", line.trim());
      const r = await fetch("/api/companion/turn", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      const res = j.result;
      setTurns((t) => [
        ...(audio ? [...t, { role: "resident" as const, text: res.transcript }] : t),
        { role: "ai", text: res.reply, fixed: res.replySource === "fixed_safe_reply" },
      ]);
      if (res.alert) setAlerts((a) => [{ at: new Date().toLocaleTimeString(), ...res.alert, quote: res.transcript }, ...a]);
      say(res.reply);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const startRec = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        send("", new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }));
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setError("无法使用麦克风。Microphone not available.");
    }
  };
  const stopRec = () => { recRef.current?.stop(); setRecording(false); };

  const makeCard = async () => {
    setCardBusy(true); setError("");
    try {
      const r = await fetch("/api/companion/card", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: turns.map(({ role, text }) => ({ role, text })), carerLanguage }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setCard(j.result);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setCardBusy(false);
    }
  };

  const ack = (i: number) => {
    if (!nurse.trim()) return;
    setAlerts((a) => a.map((x, k) => (k === i ? { ...x, ackBy: `${nurse.trim()} ${new Date().toLocaleTimeString()}` } : x)));
  };

  const residentSaid = turns.some((t) => t.role === "resident");
  const openUrgent = alerts.filter((a) => a.level === "urgent" && !a.ackBy).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Heart className="w-8 h-8 text-orange-500" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">Sunrise Care Companion</h1>
            <p className="text-sm text-slate-500">AI 陪院友聊天 → 整理成护工看得懂的“聊天卡” → 有危险的话马上通知护士</p>
          </div>
          <a href="/agent" className="text-sm text-orange-600 hover:underline flex items-center gap-1"><Bot className="w-4 h-4" /> 护理记录智能体</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-2">
        {/* Resident side */}
        <section className="bg-white rounded-xl border flex flex-col min-h-[560px]">
          <div className="px-4 py-3 border-b flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">院友的平板 Resident's tablet</span>
            <div className="flex-1" />
            {LANGS.map((l) => (
              <button key={l.code} disabled={started} onClick={() => setLanguage(l.code)}
                className={`px-3 py-1 rounded-full text-sm border ${language === l.code ? "bg-orange-500 text-white border-orange-500" : "bg-white text-slate-600"} disabled:opacity-60`}>
                {l.label}
              </button>
            ))}
            <button onClick={() => setSpeak((s) => !s)} title="朗读 Read aloud" className="p-2 rounded-full border text-slate-600">
              {speak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>

          {!started ? (
            <div className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">开始之前 Before you start</h2>
              <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
                <li>晨曦是 AI，不是真人，开场会先告诉院友。It tells the resident it is an AI.</li>
                <li>它不会给医疗建议。It never gives medical advice.</li>
                <li>聊天内容会整理成给护工看的卡片。The chat is summarised for care staff.</li>
                <li>示范只用虚构内容，请不要输入真实院友资料。Demo only: fictional content, no real resident data.</li>
              </ul>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>院友（或家属）已经同意和 AI 聊天，并同意把内容整理给护理人员。<br />The resident (or family) has agreed to the chat and to the summary for care staff.</span>
              </label>
              <button disabled={!consent} onClick={begin} className="px-5 py-3 rounded-lg bg-orange-500 text-white font-semibold disabled:opacity-40">
                开始聊天 Start
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px]">
                {turns.map((t, i) => (
                  <div key={i} className={`flex ${t.role === "resident" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-lg leading-relaxed ${t.role === "resident" ? "bg-orange-500 text-white" : t.fixed && i > 0 ? "bg-red-50 border border-red-200" : "bg-slate-100"}`}>
                      {t.text}
                      {t.fixed && i > 0 && <div className="mt-1 text-xs text-red-600 flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> 固定安全回复，不是 AI 自由发挥 Fixed safe reply</div>}
                    </div>
                  </div>
                ))}
                {busy && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> …</div>}
                <div ref={endRef} />
              </div>
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {SAMPLES[language].map((s) => (
                  <button key={s} disabled={busy} onClick={() => send(s)} className="text-xs px-2 py-1 rounded border bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-50">
                    {s}
                  </button>
                ))}
              </div>
              <div className="p-4 border-t flex items-center gap-2">
                <button onClick={recording ? stopRec : startRec} disabled={busy}
                  className={`p-4 rounded-full text-white ${recording ? "bg-red-500 animate-pulse" : "bg-orange-500"} disabled:opacity-40`} title="说话 Speak">
                  {recording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(text)}
                  placeholder="也可以打字 Or type here" className="flex-1 border rounded-lg px-3 py-3 text-lg" />
                <button onClick={() => send(text)} disabled={busy || !text.trim()} className="p-3 rounded-lg bg-slate-800 text-white disabled:opacity-40"><Send className="w-5 h-5" /></button>
              </div>
            </>
          )}
          {error && <div className="px-4 pb-3 text-sm text-red-600">{error}</div>}
        </section>

        {/* Staff side */}
        <section className="space-y-6">
          <div className={`rounded-xl border p-4 ${openUrgent ? "bg-red-50 border-red-300" : "bg-white"}`}>
            <div className="flex items-center gap-2 font-semibold">
              {openUrgent ? <ShieldAlert className="w-5 h-5 text-red-600" /> : <ShieldCheck className="w-5 h-5 text-emerald-600" />}
              护士提醒 Nurse alerts
              {openUrgent > 0 && <span className="ml-auto text-xs bg-red-600 text-white rounded-full px-2 py-0.5">{openUrgent} 未处理</span>}
            </div>
            <p className="text-xs text-slate-500 mt-1">示范版只显示在这个画面，没有接真实呼叫系统。Demo: shown on this screen only, not connected to a real paging system.</p>
            {alerts.length === 0 && <p className="text-sm text-slate-500 mt-3">暂时没有提醒。No alerts yet.</p>}
            <div className="mt-3 space-y-3">
              {alerts.map((a, i) => (
                <div key={i} className={`rounded-lg border p-3 text-sm ${a.level === "urgent" ? "bg-white border-red-300" : "bg-amber-50 border-amber-200"}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${a.level === "urgent" ? "bg-red-600 text-white" : "bg-amber-400 text-white"}`}>{a.level === "urgent" ? "紧急 URGENT" : "留意 NOTE"}</span>
                    <span className="text-slate-500">{a.at}</span>
                    <span className="ml-auto text-xs text-slate-500">{a.raisedBy === "rule" ? "红线规则触发 Raised by rule" : "AI 判断 Raised by AI"}</span>
                  </div>
                  <div className="mt-1 font-medium">{a.reasons.join("; ")}</div>
                  <div className="mt-1 text-slate-600 flex gap-1"><Quote className="w-3 h-3 mt-1 shrink-0" />{a.quote}</div>
                  {a.level === "urgent" && (a.ackBy
                    ? <div className="mt-2 text-emerald-700 text-xs">已处理 Acknowledged: {a.ackBy}</div>
                    : <div className="mt-2 flex gap-2">
                        <input value={nurse} onChange={(e) => setNurse(e.target.value)} placeholder="护士姓名 Nurse name" className="border rounded px-2 py-1 text-sm flex-1" />
                        <button onClick={() => ack(i)} disabled={!nurse.trim()} className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:opacity-40">我去看 I'm on it</button>
                      </div>)}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <ClipboardList className="w-5 h-5 text-orange-500" />
              <span className="font-semibold">聊天卡 Chat card</span>
              <div className="flex-1" />
              <select value={carerLanguage} onChange={(e) => setCarerLanguage(e.target.value)} className="border rounded px-2 py-1 text-sm">
                {CARER_LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
              </select>
              <button onClick={makeCard} disabled={!residentSaid || cardBusy} className="px-3 py-1.5 rounded bg-orange-500 text-white text-sm disabled:opacity-40 flex items-center gap-1">
                {cardBusy && <Loader2 className="w-4 h-4 animate-spin" />} 生成 Generate
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">每一行都要有院友的原话作依据；找不到原话的会被删掉。Every line must quote the resident; lines without a matching quote are dropped.</p>
            {!card && <p className="text-sm text-slate-500 mt-3">聊几句后点“生成”。Chat a little, then press Generate.</p>}
            {card && (
              <div className="mt-3 space-y-3 text-sm">
                {card.card.mood && (
                  <div>
                    <div className="font-semibold text-slate-700">今天的心情 Mood today</div>
                    <div>{card.card.mood.text}</div>
                    <div className="text-slate-500 flex gap-1"><Quote className="w-3 h-3 mt-1 shrink-0" />{card.card.mood.quote}</div>
                  </div>
                )}
                {SECTIONS.map(({ key, label }) => {
                  const items = card.card[key] as Item[];
                  if (!items?.length) return null;
                  return (
                    <div key={key} className={key === "tellNurse" ? "rounded-lg bg-red-50 border border-red-200 p-2" : ""}>
                      <div className="font-semibold text-slate-700">{label}</div>
                      <ul className="space-y-1 mt-1">
                        {items.map((it, i) => (
                          <li key={i}>
                            <div>• {it.text}</div>
                            <div className="text-slate-500 flex gap-1 pl-3"><Quote className="w-3 h-3 mt-1 shrink-0" />{it.quote}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
                {card.ruleFlags.length > 0 && (
                  <div className="rounded-lg bg-red-50 border border-red-300 p-2">
                    <div className="font-semibold text-red-700">红线规则发现 Found by red-flag rules</div>
                    {card.ruleFlags.map((f, i) => (
                      <div key={i} className="mt-1">• {f.reason}<div className="text-slate-500 flex gap-1 pl-3"><Quote className="w-3 h-3 mt-1 shrink-0" />{f.quote}</div></div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-slate-500 border-t pt-2">
                  {card.droppedUnquoted > 0 && <div>已删除 {card.droppedUnquoted} 行没有原话依据的内容。Dropped {card.droppedUnquoted} line(s) with no matching quote.</div>}
                  <div>{card.disclaimer} · {(card.ms / 1000).toFixed(1)}s</div>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
