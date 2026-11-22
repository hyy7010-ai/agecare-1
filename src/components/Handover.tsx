// Sunrise Care Handover — added for the Cyberport AI Agent Challenge (Nov 2026).
// Public demo page at /handover. Reads the shift log filled by /agent and /companion.
import React, { useState } from "react";
import { ClipboardCheck, ShieldAlert, Loader2, Trash2, Sparkles, FileText, Bell, MessageCircle, Users } from "lucide-react";
import { ShiftEntry, readShift, clearShift, setShift } from "../lib/shiftLog";

type Line = { text: string; sources: string[] };
type Result = {
  mustSeeFirst: { id: string; at: string; resident?: string; why: string; text: string; status?: string }[];
  residents: { name: string; happened: Line[]; followUp: Line[]; howToTalk: Line[] }[];
  droppedUnsourced: number; entriesUsed: number; ms: number; disclaimer: string;
};

const LANGS = [
  { code: "en", label: "English" },
  { code: "zh", label: "简体中文" },
  { code: "zh-HK", label: "繁體中文" },
  { code: "tl", label: "Tagalog" },
];

// Fictional shift written for the demo. Not real residents or events.
const DEMO: ShiftEntry[] = [
  { id: "N1", at: "07:10", kind: "note", resident: "王奶奶", pending: true, status: "红线：护士必须核对，还没决定 RN must check, not decided yet",
    text: "At 07:00, the resident experienced a fall in the bathroom and struck her head. Minor bleeding was observed on her forehead. The carer assisted the resident to sit on a chair and applied pressure to the area with gauze." },
  { id: "N2", at: "08:20", kind: "note", resident: "陳伯", status: "护士已确认 RN approved",
    text: "The resident ate half a bowl of congee this morning. The carer assisted him to the toilet. He reported some pain in his knee." },
  { id: "A1", at: "10:02", kind: "alert", resident: "陳婆婆", urgent: true, status: "护士已处理 Acknowledged by Nurse Lee 10:04",
    text: "Chest pain or tightness. 原话 Resident said: 呢兩日心口有啲翳。" },
  { id: "C1", at: "10:06", kind: "card", resident: "陳婆婆",
    text: "Likes to talk about: working at a tea house making dim sum for thirty years (我以前喺茶樓做點心，做咗三十年。). Avoid: talking about her husband (唔好同我講我老公，講起我會好唔開心。). Habits: hot water in the morning; sitting by the window after lunch (我鍾意朝早飲杯熱水，食完晏想坐喺窗邊。)." },
  { id: "N3", at: "13:40", kind: "note", resident: "李婆婆", status: "护士已确认 RN approved",
    text: "The resident refused lunch today. She seemed quiet but settled. Her daughter phoned to ask about her mood." },
  { id: "A2", at: "14:15", kind: "alert", resident: "李婆婆", status: "留意 Note",
    text: "Resident reports sleep trouble and feeling lonely in the early morning. 原话 Resident said: 晚上总是睡不好，三四点就醒了，一个人躺着很闷。" },
];

const KIND = {
  note: { label: "护理记录 Note", icon: FileText, cls: "bg-slate-100 text-slate-700" },
  alert: { label: "护士提醒 Alert", icon: Bell, cls: "bg-red-100 text-red-700" },
  card: { label: "聊天卡 Chat card", icon: MessageCircle, cls: "bg-orange-100 text-orange-700" },
} as const;
const WHY: Record<string, string> = {
  urgent: "紧急 Urgent",
  waiting_for_nurse: "等护士决定 Waiting for nurse",
  urgent_and_waiting: "紧急，等护士决定 Urgent, waiting for nurse",
};

export function Handover() {
  const [entries, setEntries] = useState<ShiftEntry[]>(readShift());
  const [language, setLanguage] = useState("en");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [focus, setFocus] = useState("");

  const loadDemo = () => { setShift(DEMO); setEntries(DEMO); setResult(null); };
  const clear = () => { clearShift(); setEntries([]); setResult(null); };

  const run = async () => {
    setBusy(true); setError(""); setResult(null);
    try {
      const r = await fetch("/api/handover", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries, language }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");
      setResult(j.result);
    } catch (e: any) {
      setError(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const Src = ({ ids }: { ids: string[] }) => (
    <span className="ml-1 inline-flex gap-1 align-middle">
      {ids.map((id) => (
        <button key={id} onMouseEnter={() => setFocus(id)} onMouseLeave={() => setFocus("")} onClick={() => setFocus(id)}
          className="text-[11px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 hover:bg-orange-200" title="来源 Source entry">{id}</button>
      ))}
    </span>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <ClipboardCheck className="w-8 h-8 text-orange-500" />
          <div className="flex-1">
            <h1 className="text-xl font-bold">Sunrise Care Handover</h1>
            <p className="text-sm text-slate-500">这个班的记录、提醒、聊天卡 → 智能体整理成一页交班单 → 每一行都能点回来源</p>
          </div>
          <a href="/demo" className="text-sm text-orange-600 hover:underline">← 示范首页 Demo home</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">这个班的记录 Shift log</span>
            <span className="text-xs text-slate-500">{entries.length} 条 entries</span>
            <div className="flex-1" />
            <button onClick={loadDemo} className="text-sm px-3 py-1.5 rounded border bg-orange-50 text-orange-700 flex items-center gap-1"><Sparkles className="w-4 h-4" />载入示范班次 Load demo shift</button>
            <button onClick={clear} disabled={!entries.length} className="text-sm px-2 py-1.5 rounded border text-slate-500 disabled:opacity-40" title="清空 Clear"><Trash2 className="w-4 h-4" /></button>
          </div>
          <p className="text-xs text-slate-500 mt-1">在“护理记录”和“陪伴聊天”页面做的事会自动出现在这里（只存在这个浏览器）。也可以直接载入虚构的示范班次。Entries come from the other two demo pages, or load a fictional shift.</p>
          {!entries.length && <p className="text-sm text-slate-500 mt-4">还没有记录。No entries yet.</p>}
          <div className="mt-3 space-y-2 max-h-[560px] overflow-y-auto">
            {entries.map((e) => {
              const K = KIND[e.kind]; const Icon = K.icon;
              return (
                <div key={e.id} className={`rounded-lg border p-3 text-sm transition ${focus === e.id ? "ring-2 ring-orange-400 bg-orange-50" : ""}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-white">{e.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${K.cls}`}><Icon className="w-3 h-3" />{K.label}</span>
                    <span className="text-slate-500">{e.at}</span>
                    {e.resident && <span className="font-medium">{e.resident}</span>}
                    {e.urgent && <span className="text-xs font-bold text-red-600">紧急 URGENT</span>}
                    {e.pending && <span className="text-xs font-bold text-amber-600">等护士 WAITING</span>}
                  </div>
                  <div className="mt-1 text-slate-700">{e.text}</div>
                  {e.status && <div className="mt-1 text-xs text-slate-500">{e.status}</div>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-white rounded-xl border p-4 flex flex-wrap items-center gap-2">
            <span className="font-semibold">交班单 Handover sheet</span>
            <div className="flex-1" />
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="border rounded px-2 py-1.5 text-sm">
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            <button onClick={run} disabled={!entries.length || busy} className="px-4 py-2 rounded-lg bg-orange-500 text-white font-semibold disabled:opacity-40 flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}生成交班单 Generate
            </button>
            {error && <div className="w-full text-sm text-red-600">{error}</div>}
          </div>

          {result && (
            <>
              <div className="rounded-xl border border-red-300 bg-red-50 p-4">
                <div className="flex items-center gap-2 font-semibold text-red-700"><ShieldAlert className="w-5 h-5" />必须先看 Must see first</div>
                <p className="text-xs text-slate-600 mt-1">这一栏由规则从记录里直接列出，不经过 AI，AI 不能删改。Built by rules from the log, not by the AI.</p>
                {result.mustSeeFirst.length === 0 && <p className="text-sm text-slate-600 mt-2">这个班没有紧急或等护士决定的事项。Nothing urgent or waiting.</p>}
                <div className="mt-2 space-y-2">
                  {result.mustSeeFirst.map((m) => (
                    <div key={m.id} className="rounded-lg bg-white border border-red-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white">{WHY[m.why] || m.why}</span>
                        <span className="text-slate-500">{m.at}</span>
                        {m.resident && <span className="font-medium">{m.resident}</span>}
                        <Src ids={[m.id]} />
                      </div>
                      <div className="mt-1">{m.text}</div>
                      {m.status && <div className="mt-1 text-xs text-slate-500">{m.status}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-4 space-y-4">
                <div className="flex items-center gap-2 font-semibold"><Users className="w-5 h-5 text-orange-500" />按院友整理 By resident</div>
                {result.residents.length === 0 && <p className="text-sm text-slate-500">AI 没有整理出内容，请直接看左边的记录。Nothing summarised; read the log.</p>}
                {result.residents.map((r) => (
                  <div key={r.name} className="border-t pt-3 first:border-t-0 first:pt-0">
                    <div className="font-semibold text-lg">{r.name}</div>
                    {([["happened", "这个班发生的事 What happened"], ["followUp", "下一班要跟进 Follow up"], ["howToTalk", "怎样和他/她聊 How to talk"]] as const).map(([k, label]) =>
                      r[k].length ? (
                        <div key={k} className="mt-2 text-sm">
                          <div className="text-slate-500 text-xs font-semibold">{label}</div>
                          <ul className="mt-1 space-y-1">
                            {r[k].map((l, i) => <li key={i}>• {l.text}<Src ids={l.sources} /></li>)}
                          </ul>
                        </div>
                      ) : null,
                    )}
                  </div>
                ))}
                <div className="text-xs text-slate-500 border-t pt-2">
                  {result.droppedUnsourced > 0 && <div>已删除 {result.droppedUnsourced} 行没有来源的内容。Dropped {result.droppedUnsourced} line(s) with no source.</div>}
                  <div>{result.disclaimer} · {result.entriesUsed} entries · {(result.ms / 1000).toFixed(1)}s</div>
                </div>
              </div>
            </>
          )}
          {!result && <p className="text-sm text-slate-500 px-1">点“生成交班单”后，这里显示：必须先看的事项、按院友整理的摘要。每一行后面的小标签是来源，鼠标移上去会在左边高亮。</p>}
        </section>
      </main>
      <footer className="max-w-6xl mx-auto px-4 pb-8 text-xs text-slate-500">演示只使用虚构数据。交班单是 AI 摘要，不是临床记录。Demo uses fictional data only. The handover sheet is an AI summary, not a clinical record.</footer>
    </div>
  );
}
