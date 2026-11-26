// Sunrise Care Handover — added for the Cyberport AI Agent Challenge (Nov 2026).
// Public demo page at /handover. Reads the shift log filled by /agent and /companion.
import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { ShiftEntry, readShift, clearShift, setShift } from "../lib/shiftLog";
import { ScPage, Label, useEn, btnPrimary, btnSecondary } from "./ScShell";

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
  note: ["护理记录", "Note"],
  alert: ["护士提醒", "Alert"],
  card: ["聊天卡", "Chat card"],
} as const;
const WHY: Record<string, [string, string]> = {
  urgent: ["紧急", "Urgent"],
  waiting_for_nurse: ["等护士决定", "Waiting for nurse"],
  urgent_and_waiting: ["紧急，等护士决定", "Urgent, waiting for nurse"],
};

export function Handover() {
  const { en, t } = useEn();
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

  const show = (id: string) => {
    setFocus(id);
    document.getElementById(`src-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const Src = ({ ids }: { ids: string[] }) => (
    <span className="flex flex-wrap gap-1.5 shrink-0">
      {ids.map((id) => (
        <button key={id} onMouseEnter={() => setFocus(id)} onMouseLeave={() => setFocus("")} onClick={() => show(id)}
          aria-label={t(`原始记录 ${id}`, `Source entry ${id}`)}
          className={`min-w-7 h-7 px-2 rounded-full text-xs font-medium tabular-nums cursor-pointer ${focus === id ? "bg-sc-ink text-white" : "border border-black/15 bg-white text-sc-ink-2 hover:text-sc-ink"}`}>{id}</button>
      ))}
    </span>
  );

  return (
    <ScPage current="/handover">
      <main className="max-w-[1120px] mx-auto px-4 sm:px-8 pt-10 pb-20 flex flex-col">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-[1_1_300px] flex flex-col">
            <h1 className="m-0 text-[40px] leading-[48px] font-semibold tracking-[-0.02em]">{t("交班单", "Handover")}</h1>
            <span className="mt-2 text-base text-sc-muted">{t("一个班的事整理成一页。点数字看原始记录。", "One shift on one page. Tap a number to see where it came from.")}</span>
          </div>
          <label htmlFor="hl" className="sr-only">{t("交班单语言", "Handover language")}</label>
          <select id="hl" value={language} onChange={(e) => setLanguage(e.target.value)}
            className="min-h-11 px-4 rounded-full border border-black/15 bg-white text-[15px] cursor-pointer">
            {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <button onClick={loadDemo} className={`${btnSecondary} min-h-11 text-[15px]`}>{t("载入示范班次", "Load demo shift")}</button>
          <button onClick={run} disabled={!entries.length || busy} className={`${btnPrimary} min-h-11 text-[15px]`}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}{result ? t("重新生成", "Regenerate") : t("生成交班单", "Generate")}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-sc-red-text" role="alert">{error}</p>}

        <div className="mt-12 flex flex-wrap gap-16 items-start">

          {/* Left: the sheet */}
          <section className="flex-[1.4_1_480px] min-w-0 flex flex-col">
            {!result && (
              <p className="text-base leading-7 text-sc-muted">
                {entries.length
                  ? t("点「生成交班单」，这里会出现先要看的事，再按院友整理。每行右边的数字是来源，点一下右边那条会亮起来。",
                    "Press Generate. Things to see first come at the top, then a summary per resident. The number on each line is its source; tap it to highlight the entry.")
                  : t("还没有记录。先点「载入示范班次」，或者去「护理记录」「陪伴聊天」做一次。",
                    "No entries yet. Load the demo shift, or try Care notes or Companion first.")}
              </p>
            )}

            {result && (
              <>
                <div className="rounded-[20px] bg-sc-red-tint p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-sc-red-text">
                    <span className="w-2 h-2 rounded-full bg-sc-red" aria-hidden="true" />{t("先看这些", "See these first")}
                    <span className="ml-auto font-normal text-sc-muted">{t("规则直接列出，AI 不能删改", "Listed by rules, not the AI")}</span>
                  </div>
                  {result.mustSeeFirst.length === 0 && <p className="m-0 text-[15px] text-sc-ink-2">{t("这个班没有紧急或等护士决定的事。", "Nothing urgent or waiting for a nurse.")}</p>}
                  {result.mustSeeFirst.map((m, i) => (
                    <React.Fragment key={m.id}>
                      {i > 0 && <div className="h-px bg-black/10" />}
                      <div className="flex gap-4 items-start">
                        <div className="flex-1 flex flex-col gap-1">
                          <span className="text-[19px] font-semibold">{m.resident ? `${m.resident} ` : ""}<span className="text-sc-muted font-normal text-[15px] tabular-nums">{m.at}</span></span>
                          <span className="text-[13px] font-medium text-sc-red-text">{WHY[m.why] ? (en ? WHY[m.why][1] : WHY[m.why][0]) : m.why}</span>
                          <span className="text-[15px] leading-6 text-sc-ink-2">{m.text}</span>
                          {m.status && <span className="text-[13px] text-sc-muted">{m.status}</span>}
                        </div>
                        <Src ids={[m.id]} />
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {result.residents.length === 0 && <p className="mt-10 text-[15px] text-sc-muted">{t("AI 没有整理出内容，请直接看右边的原始记录。", "Nothing summarised; read the entries on the right.")}</p>}
                {result.residents.map((r) => (
                  <div key={r.name} className="mt-10 flex flex-col">
                    <span className="text-[19px] font-semibold pb-3">{r.name}</span>
                    {([["happened", "这个班发生的事", "What happened"], ["followUp", "下一班要跟进", "Follow up"], ["howToTalk", "怎样和他/她聊", "How to talk with them"]] as const).map(([k, zh, e]) =>
                      r[k].length ? (
                        <div key={k} className="mt-3 flex flex-col">
                          <Label>{en ? e : zh}</Label>
                          {r[k].map((l, i) => (
                            <div key={i} className={`flex gap-4 items-center py-4 border-t border-sc-line ${i === r[k].length - 1 ? "border-b" : ""}`}>
                              <span className="flex-1 text-base leading-6">{l.text}</span>
                              <Src ids={l.sources} />
                            </div>
                          ))}
                        </div>
                      ) : null,
                    )}
                  </div>
                ))}
                <div className="mt-4 text-[13px] leading-5 text-sc-muted">
                  {result.droppedUnsourced > 0 && <div>{t(`删掉了 ${result.droppedUnsourced} 行没有来源的内容。`, `Dropped ${result.droppedUnsourced} line(s) with no source.`)}</div>}
                  <div>{result.disclaimer} · {t(`${result.entriesUsed} 条记录 · ${(result.ms / 1000).toFixed(1)} 秒`, `${result.entriesUsed} entries · ${(result.ms / 1000).toFixed(1)}s`)}</div>
                </div>
              </>
            )}
          </section>

          {/* Right: raw entries */}
          <aside className="flex-[1_1_320px] min-w-0 flex flex-col">
            <div className="flex items-baseline gap-3">
              <Label className="flex-1">{t(`原始记录　${entries.length} 条`, `Shift entries  ${entries.length}`)}</Label>
              {!!entries.length && <button onClick={clear} className="text-[13px] text-sc-muted underline cursor-pointer">{t("清空", "Clear")}</button>}
            </div>
            <p className="m-0 pb-3 text-[13px] leading-5 text-sc-muted">{t("「护理记录」「陪伴聊天」里做的事会自动出现在这里，只存在这个浏览器。", "Entries from Care notes and Companion appear here. Stored in this browser only.")}</p>
            <div className="flex flex-col max-h-[640px] overflow-y-auto">
              {entries.map((e) => {
                const on = focus === e.id;
                return (
                  <div key={e.id} id={`src-${e.id}`}
                    className={`flex gap-3.5 items-start py-3.5 px-3 -mx-3 transition-colors ${on ? "bg-sc-photo rounded-xl" : "border-t border-sc-line"}`}>
                    <span className={`shrink-0 min-w-6 h-6 px-1.5 rounded-full text-xs font-medium flex items-center justify-center tabular-nums ${on ? "bg-sc-ink text-white" : "border border-black/15 text-sc-ink-2"}`}>{e.id}</span>
                    <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <span className="text-[13px] text-sc-muted">
                        {en ? KIND[e.kind][1] : KIND[e.kind][0]}　<span className="tabular-nums">{e.at}</span>{e.resident && <>　<span className="text-sc-ink">{e.resident}</span></>}
                        {e.urgent && <span className="ml-2 text-sc-red-text font-medium">{t("紧急", "Urgent")}</span>}
                        {e.pending && <span className="ml-2 text-sc-red-text font-medium">{t("等护士", "Waiting")}</span>}
                      </span>
                      <span className="text-[15px] leading-[22px] break-words">{e.text}</span>
                      {e.status && <span className="text-[13px] text-sc-muted">{e.status}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </main>
      <footer className="max-w-[1120px] mx-auto px-4 sm:px-8 pb-10 text-[13px] text-sc-muted">
        {t("示范只用虚构数据。交班单是 AI 摘要，不是临床记录。", "Demo uses fictional data only. The handover sheet is an AI summary, not a clinical record.")}
      </footer>
    </ScPage>
  );
}
