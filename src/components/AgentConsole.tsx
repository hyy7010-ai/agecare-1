// Sunrise Care Agent console — added for the Cyberport AI Agent Challenge (Nov 2026).
// Public demo page at /agent. Uses fictional sample inputs only.
import React, { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, ChevronDown, ChevronRight, Lock } from "lucide-react";
import { ScPage, Label, useEn, btnPrimary, btnSecondary, tab } from "./ScShell";

type Step = {
  step: number; tool: string; reason: string; args: any; output: any; ms: number;
  enforcedBy: "agent" | "orchestrator";
};
type AgentResult = {
  status: string; transcript: string; detectedLanguage?: string; maskedIdentifiers: number;
  note?: { englishNote: string; nativeConfirmation: string; suggestedFollowUps?: string[] };
  verification?: { supported: boolean; unsupportedStatements: string[] };
  sirs?: {
    isReportable: boolean; category: string; priority: number | null; timeframe: string | null;
    rationale?: string; mustReportReasons: string[]; rnCheckReasons: string[]; rnMustCheck: boolean; raisedByRedLine: boolean; lockDowngrade: boolean;
    framework?: string; jurisdiction?: "AU" | "HK"; modelPriority?: number | null;
  };
  review?: { ticket: string; status: string; note: string };
  trace: Step[]; totalMs: number; model: string;
};
import { addShift, updateShift } from "../lib/shiftLog";
type AuditEntry = { at: string; action: string; detail: string };

const LANGS = [
  { code: "zh", zh: "普通话", en: "Mandarin" },
  { code: "yue", zh: "粤语", en: "Cantonese" },
  { code: "zh-HK", zh: "繁體", en: "Traditional Chinese" },
  { code: "en", zh: "English", en: "English" },
  { code: "tl", zh: "Tagalog", en: "Tagalog" },
];

// Fictional examples written for the demo. Not real residents or events.
const SAMPLES = [
  { lang: "zh", zh: "跌倒撞头", en: "Fall, hit head (Mandarin)", text: "王奶奶早上七点在卫生间跌倒了，撞到头，额头有一点流血，我扶她起来坐在椅子上，用纱布按住了。" },
  { lang: "yue", zh: "吃饭和如厕（粤语）", en: "Meal and toilet (Cantonese)", text: "陳伯今朝食咗半碗粥，之後我扶佢去廁所，佢話膝頭有啲痛。" },
  { lang: "zh", zh: "被推", en: "Pushed by staff (Mandarin)", text: "另一个护工推了刘奶奶一下，她很害怕，一直在哭。" },
  { lang: "en", zh: "带电话号码（英文）", en: "With a phone number", text: "Mrs Lee refused lunch today. Her daughter called from 0412 345 678 asking about her mood. She seemed quiet but settled." },
];

const TOOL_LABEL: Record<string, [string, string]> = {
  transcribe_audio: ["转写录音", "Transcribe audio"],
  draft_progress_note: ["写英文护理记录", "Draft the note"],
  verify_against_source: ["逐句对照原话", "Check against what was said"],
  assess_incident: ["判断是不是严重事故", "Assess the incident"],
  route_for_human_review: ["交给护士", "Send to a nurse"],
};

const AUDIT_KEY = "sunrise_agent_audit";
const readAudit = (): AuditEntry[] => {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]"); } catch { return []; }
};

export function AgentConsole() {
  const { en, t } = useEn();
  const [language, setLanguage] = useState("zh");
  const [jurisdiction, setJurisdiction] = useState<"AU" | "HK">("HK");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [live, setLive] = useState<{ steps: Step[]; running: { step: number; tool: string; reason: string; enforcedBy: string }[] }>({ steps: [], running: [] });
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [editedNote, setEditedNote] = useState("");
  const [rnName, setRnName] = useState("");
  const [approver, setApprover] = useState("");
  const [rnCheck, setRnCheck] = useState<"" | "report" | "no_report">("");
  const [decision, setDecision] = useState<"" | "approved" | "returned">("");
  const [lockMsg, setLockMsg] = useState("");
  const [audit, setAudit] = useState<AuditEntry[]>(readAudit());
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const log = (action: string, detail: string) => {
    const next = [{ at: new Date().toLocaleString(), action, detail }, ...readAudit()].slice(0, 50);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
    setAudit(next);
  };

  useEffect(() => { if (result?.note) setEditedNote(result.note.englishNote); }, [result]);

  const startRec = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        setAudioBlob(new Blob(chunks.current, { type: rec.mimeType || "audio/webm" }));
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      setError(t("用不了麦克风。", "Microphone not available."));
    }
  };
  const stopRec = () => { recRef.current?.stop(); setRecording(false); };

  const run = async () => {
    setLoading(true); setError(""); setResult(null); setLive({ steps: [], running: [] }); setDecision(""); setApprover(""); setRnCheck(""); setLockMsg(""); setOpen({});
    try {
      const fd = new FormData();
      fd.append("language", language);
      fd.append("jurisdiction", jurisdiction);
      fd.append("text", text);
      if (audioBlob) fd.append("audio", audioBlob, "note.webm");
      const r = await fetch("/api/agent/run?stream=1", { method: "POST", body: fd });
      if (!r.ok || !r.body) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Agent failed");
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let final: AgentResult | null = null;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "tool_start") setLive((l) => ({ steps: l.steps, running: [...l.running, ev] }));
          if (ev.type === "step") setLive((l) => ({ steps: [...l.steps, ev.step], running: l.running.filter((r) => r.step !== ev.step.step) }));
          if (ev.type === "result") final = ev.result;
          if (ev.type === "error") throw new Error(ev.error);
        }
      }
      if (!final) throw new Error("Agent stopped before finishing.");
      setResult(final);
      if (final.note && final.review?.ticket)
        addShift({
          id: final.review.ticket, kind: "note", text: final.note.englishNote,
          urgent: !!final.sirs?.lockDowngrade, pending: true,
          status: final.sirs?.lockDowngrade ? `必须上报 Must report (${final.sirs.timeframe || ""})，等护士确认 awaiting RN`
            : final.sirs?.rnMustCheck ? "红线：护士必须核对，还没决定 RN must check, not decided yet" : "等护士确认 Awaiting RN",
        });
      log("AGENT_RUN", `${final.review?.ticket} · ${final.trace.length} steps · SIRS P${final.sirs?.priority ?? "-"}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const tryDowngrade = () => {
    if (!result?.sirs) return;
    if (result.sirs.lockDowngrade) {
      setLockMsg(t(`已锁定：这是必须上报的严重事故（期限 ${result.sirs.timeframe}），不能降级。`, `Locked: this must be reported (${result.sirs.timeframe}). It cannot be downgraded.`));
      log("BLOCKED_DOWNGRADE", `${result.review?.ticket} · attempted P1 → P2`);
    } else {
      setLockMsg(t("护士可以调整，但会记进审计日志。", "A nurse may adjust it; the change is logged."));
      log("PRIORITY_CHANGE_REQUESTED", `${result.review?.ticket}`);
    }
  };

  const decide = (d: "approved" | "returned") => {
    if (!rnName.trim()) { setError(t("先填确认护士的名字。", "Enter the nurse's name first.")); return; }
    if (d === "approved" && result?.sirs?.rnMustCheck && !rnCheck) {
      setError(t("先选这件事要不要上报。", "Choose whether to report it first.")); return;
    }
    setError(""); setDecision(d); setApprover(rnName.trim());
    if (result?.sirs?.rnMustCheck && rnCheck)
      log("RN_REPORTING_DECISION", `${result?.review?.ticket} · ${rnCheck === "report" ? "will report" : "not reportable"} · by ${rnName}`);
    const edited = result?.note && editedNote.trim() !== result.note.englishNote.trim();
    if (result?.review?.ticket)
      updateShift(result.review.ticket, {
        text: editedNote.trim() || result.note?.englishNote || "", pending: d !== "approved",
        status: d === "approved"
          ? `护士已确认 RN approved by ${rnName.trim()}${result.sirs?.lockDowngrade ? " · 必须上报 must report" : rnCheck === "report" ? " · 决定上报 will report" : rnCheck === "no_report" ? " · 决定不用上报 not reportable" : ""}`
          : `护士退回 Returned by ${rnName.trim()}`,
      });
    log(d === "approved" ? "RN_APPROVED" : "RN_RETURNED",
      `${result?.review?.ticket} · by ${rnName}${edited ? " · note edited by RN" : ""}`);
  };

  const s = result?.sirs;
  const guardrails = result ? [
    { ok: true, label: t("遮掉号码", "Mask numbers"),
      detail: result.maskedIdentifiers ? t(`遮掉了 ${result.maskedIdentifiers} 个`, `${result.maskedIdentifiers} masked before the AI`) : t("没有号码", "None found") },
    { ok: !!result.verification?.supported, label: t("逐句对照原话", "Check against what was said"),
      detail: result.verification?.supported ? t("每句都对得上", "Every sentence matches")
        : t(`${result.verification?.unsupportedStatements?.length || 0} 句对不上，要护士看`, `${result.verification?.unsupportedStatements?.length || 0} unsupported, nurse to check`) },
    { ok: !(s?.raisedByRedLine || s?.rnMustCheck || s?.lockDowngrade), label: t("判断是不是严重事故", "Serious incident rule"),
      detail: s?.raisedByRedLine ? t("AI 原本说不用报，规则改成必须报", "AI said no; the rule made it must-report")
        : s?.rnMustCheck ? t("要护士决定", "Nurse must decide")
        : s?.lockDowngrade ? t("必须上报，已锁定", "Must report, locked") : t("没有触发", "Not triggered") },
    { ok: decision === "approved", pending: !decision, label: t("交给护士", "Nurse sign-off"),
      detail: decision === "approved" ? t(`${approver} 已确认`, `Approved by ${approver}`) : decision === "returned" ? t("已退回护工", "Returned to carer") : t("等确认", "Waiting") },
  ] : [];

  const needsNurse = !!s && (s.priority === 1 || s.rnMustCheck);
  const steps = result?.trace || live.steps;

  return (
    <ScPage current="/agent">
      <main className="max-w-[1120px] mx-auto px-4 sm:px-8 pt-10 pb-20 flex flex-wrap gap-16 items-start">

        {/* Left: what happened */}
        <section className="flex-[1_1_380px] min-w-0 flex flex-col">
          <h1 className="m-0 text-[40px] leading-[48px] font-semibold tracking-[-0.02em]">{t("护理记录", "Care notes")}</h1>
          <p className="mt-2 text-base text-sc-muted">{t("用你的语言说发生了什么。", "Say what happened, in your own language.")}</p>

          <div role="group" aria-label={t("语言", "Language")} className="mt-9 flex flex-wrap gap-x-5 gap-y-1">
            {LANGS.map((l) => (
              <button key={l.code} onClick={() => setLanguage(l.code)} aria-pressed={language === l.code} className={tab(language === l.code)}>{en ? l.en : l.zh}</button>
            ))}
          </div>

          <label htmlFor="say" className="sr-only">{t("发生了什么", "What happened")}</label>
          <textarea id="say" value={text} onChange={(e) => setText(e.target.value)} rows={6}
            placeholder={t("打字或录音，说说刚才发生了什么。", "Type or record what just happened.")}
            className="mt-2 w-full text-xl leading-8 border-0 border-b border-sc-line py-5 bg-transparent resize-y placeholder:text-sc-muted focus:outline-none focus:border-sc-ink" />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button onClick={run} disabled={loading || (!text.trim() && !audioBlob)} className={btnPrimary}>
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}{t("生成记录", "Generate note")}
            </button>
            {!recording ? (
              <button onClick={startRec} aria-label={t("录音", "Record")} className="w-12 h-12 rounded-full border border-black/15 bg-white flex items-center justify-center cursor-pointer"><Mic className="w-5 h-5" strokeWidth={1.8} /></button>
            ) : (
              <button onClick={stopRec} aria-label={t("停止录音", "Stop recording")} className="w-12 h-12 rounded-full bg-sc-red text-white flex items-center justify-center cursor-pointer"><Square className="w-4 h-4" fill="currentColor" /></button>
            )}
            {audioBlob && <span className="text-sm text-sc-ink-2">{t("已录音", "Audio attached")}</span>}
          </div>
          {error && <p className="mt-3 text-sm text-sc-red-text" role="alert">{error}</p>}

          <div className="mt-10 flex flex-col gap-2.5 text-sm text-sc-muted">
            <span>{t("事故按哪里的规定判断", "Incident rules")}</span>
            <div role="group" aria-label={t("规定", "Rules")} className="flex flex-wrap gap-x-5 gap-y-1">
              {([["HK", "香港社署特別事故，3 天內", "Hong Kong special incident (3 days)"], ["AU", "澳洲 SIRS，24 小时 / 30 天", "Australia SIRS (24h / 30d)"]] as const).map(([k, zh, e]) => (
                <button key={k} onClick={() => setJurisdiction(k)} aria-pressed={jurisdiction === k} className={tab(jurisdiction === k)}>{en ? e : zh}</button>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-1.5 text-sm">
            <span className="text-sc-muted">{t("试试虚构示例", "Try a fictional example")}</span>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {SAMPLES.map((x) => (
                <button key={x.zh} onClick={() => { setText(x.text); setLanguage(x.lang); setAudioBlob(null); }}
                  className="text-sc-ink underline underline-offset-2 hover:text-sc-ink-2 cursor-pointer min-h-8">{en ? x.en : x.zh}</button>
              ))}
            </div>
          </div>
        </section>

        {/* Right: result */}
        <section className="flex-[1.2_1_460px] min-w-0 flex flex-col pt-2">
          {!result && !loading && (
            <p className="text-base leading-7 text-sc-muted">{t("说完点「生成记录」，这里会出现英文记录草稿、智能体每一步做了什么，最后交给护士确认。",
              "After you press Generate note, the English draft and every step the agent took appear here, then it goes to a nurse.")}</p>
          )}

          {result?.note && (
            <div className="flex flex-col">
              <div className="flex items-baseline gap-3 text-[13px] text-sc-muted">
                <span>{t("英文记录草稿（护士可以改）", "English draft (nurse can edit)")}</span>
                <span className="ml-auto">{decision === "approved" ? t("已生效", "Approved") : t("还没生效，等护士确认", "Not final until a nurse approves")}</span>
              </div>
              <label htmlFor="note" className="sr-only">{t("英文记录草稿", "English draft")}</label>
              <textarea id="note" lang="en" value={editedNote} onChange={(e) => setEditedNote(e.target.value)} rows={5}
                className="mt-3 w-full text-[22px] leading-9 tracking-[-0.005em] border-0 border-b border-sc-line pb-4 bg-transparent resize-y focus:outline-none focus:border-sc-ink" />
              {result.note.nativeConfirmation && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-sc-ink-2">{t("翻回护工的语言核对", "Back-translation for the carer")}</summary>
                  <p className="mt-2 text-[15px] leading-6 text-sc-ink-2">{result.note.nativeConfirmation}</p>
                </details>
              )}
              {!!result.note.suggestedFollowUps?.length && (
                <div className="mt-4 text-[13px] leading-5 text-sc-muted">
                  {t("原话里没说、护士可能要补的（没写进记录）：", "Not in what was said; the nurse may want to add (not in the note):")}
                  <ul className="mt-1 list-disc ml-5">{result.note.suggestedFollowUps.map((f) => <li key={f}>{f}</li>)}</ul>
                </div>
              )}
              {result.verification && !result.verification.supported && (
                <div className="mt-5 rounded-[20px] bg-sc-red-tint p-5 text-[15px] leading-6">
                  <div className="font-semibold text-sc-red-text">{t("这几句在原话里找不到，请护士删改", "These sentences aren't in what was said. Nurse to edit")}</div>
                  <ul className="mt-1 list-disc ml-5">{result.verification.unsupportedStatements.map((u) => <li key={u}>{u}</li>)}</ul>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="mt-10 flex flex-col">
              <Label>{t("安全检查", "Safety checks")}</Label>
              {guardrails.map((g, i) => (
                <div key={g.label} className={`flex gap-3 py-3 border-t border-sc-line text-[15px] ${i === guardrails.length - 1 ? "border-b" : ""}`}>
                  <span aria-hidden="true" className={`w-4 ${g.ok ? "text-sc-ink" : g.pending ? "text-sc-muted" : "text-sc-red-text font-semibold"}`}>{g.ok ? "✓" : g.pending ? "○" : "!"}</span>
                  <span className="flex-1">{g.label}</span>
                  <span className={`text-right ${g.ok || g.pending ? "text-sc-muted" : "text-sc-red-text"}`}>{g.detail}</span>
                </div>
              ))}
            </div>
          )}

          {result && (
            <div className={`mt-10 flex flex-col gap-3.5 ${needsNurse ? "rounded-[20px] bg-sc-red-tint p-6" : "border-t border-sc-line pt-6"}`}>
              <span className="text-[17px] font-semibold">{s?.rnMustCheck ? t("护士：要不要上报？", "Nurse: report this?") : t("护士确认", "Nurse sign-off")}</span>
              {s && (
                <div className="flex flex-col gap-1 text-sm leading-[22px] text-sc-ink-2">
                  <span className="text-[13px] text-sc-muted">{s.jurisdiction === "HK" ? t("香港社署特別事故", "Hong Kong special incident") : t("澳洲 SIRS 严重事故", "Australia SIRS")}{s.framework ? ` · ${s.framework}` : ""}</span>
                  <span className={s.priority === 1 ? "text-sc-red-text font-medium" : "text-sc-ink"}>
                    {s.priority === 1 ? t(`要上报，期限 ${s.timeframe}`, `Reportable · due ${s.timeframe}`)
                      : s.priority === 2 ? (s.jurisdiction === "HK" ? t(`可能要上报，请护士核对：${s.timeframe}`, `Possibly reportable, nurse to check: ${s.timeframe}`) : t(`要上报 · 第 2 级 · ${s.timeframe}`, `Reportable · Priority 2 · ${s.timeframe}`))
                      : t("不用上报", "Not reportable")}
                  </span>
                  {s.category && <span>{s.category}</span>}
                  {s.raisedByRedLine && <span>{t(`AI 原本判断：${s.modelPriority ? `第 ${s.modelPriority} 级` : "不用上报"}；红线规则提高了等级。`, `AI first said: ${s.modelPriority ? `P${s.modelPriority}` : "not reportable"}; the red-line rule raised it.`)}</span>}
                  {s.lockDowngrade && <span className="flex items-center gap-1 text-sc-red-text"><Lock className="w-3 h-3" />{t("红线锁定，不能降级", "Locked by red-line rule")}</span>}
                  {!!s.rnCheckReasons?.length && <ul className="list-disc ml-5">{s.rnCheckReasons.map((r) => <li key={r}>{r}</li>)}</ul>}
                  <button onClick={tryDowngrade} className="self-start text-[13px] underline text-sc-ink-2 cursor-pointer">{t("试试降级", "Try to downgrade")}</button>
                  {lockMsg && <span className="text-[13px] text-sc-red-text">{lockMsg}</span>}
                </div>
              )}
              {s?.rnMustCheck && (
                <fieldset className="border-0 m-0 p-0 flex flex-wrap gap-x-6 text-[15px]">
                  <legend className="sr-only">{t("上报决定", "Reporting decision")}</legend>
                  {([["report", "要上报", "Report it"], ["no_report", "不用上报", "Not reportable"]] as const).map(([k, zh, e]) => (
                    <label key={k} className="flex items-center gap-2 min-h-10 cursor-pointer">
                      <input type="radio" name="rep" checked={rnCheck === k} disabled={!!decision} onChange={() => setRnCheck(k)} className="w-[18px] h-[18px] accent-sc-ink" />{en ? e : zh}
                    </label>
                  ))}
                </fieldset>
              )}
              <span className="text-[13px] text-sc-muted">{t(`工单 ${result.review?.ticket} · AI 不能自己定稿`, `Ticket ${result.review?.ticket} · the AI can't finalise on its own`)}</span>
              <label htmlFor="rn" className="sr-only">{t("护士名字", "Nurse name")}</label>
              <input id="rn" value={rnName} onChange={(e) => setRnName(e.target.value)} placeholder={t("护士名字", "Nurse name")} disabled={!!decision}
                className="w-full max-w-[320px] text-base border-0 border-b border-black/15 bg-transparent py-2 placeholder:text-sc-muted focus:outline-none focus:border-sc-ink disabled:text-sc-muted" />
              <div className="flex flex-wrap gap-2.5">
                <button onClick={() => decide("approved")} disabled={!!decision || (!!s?.rnMustCheck && !rnCheck)} className={btnPrimary}>{t("批准", "Approve")}</button>
                <button onClick={() => decide("returned")} disabled={!!decision} className={`${btnSecondary} ${needsNurse ? "bg-transparent" : ""}`}>{t("退回给护工", "Return to carer")}</button>
              </div>
              {decision && <p className="text-[15px] text-sc-ink">{decision === "approved" ? t("已批准，记进审计日志。", "Approved and logged.") : t("已退回护工，记进审计日志。", "Returned to the carer and logged.")}</p>}
            </div>
          )}

          {(result || loading) && (
            <div className="mt-10 flex flex-col">
              <Label>{t("智能体做了什么", "What the agent did")}{result && <span>{t(`　${result.trace.length} 步 · ${(result.totalMs / 1000).toFixed(1)} 秒 · ${result.model}`, `  ${result.trace.length} steps · ${(result.totalMs / 1000).toFixed(1)}s · ${result.model}`)}</span>}</Label>
              <ol className="m-0 p-0 list-none border-b border-sc-line">
                {steps.map((st) => (
                  <li key={st.step} className="border-t border-sc-line">
                    <button onClick={() => setOpen({ ...open, [st.step]: !open[st.step] })} aria-expanded={!!open[st.step]}
                      className="w-full flex items-center gap-3 py-3 text-left text-[15px] cursor-pointer">
                      <span aria-hidden="true" className="w-4 text-sc-ink">✓</span>
                      <span className="flex-1">{TOOL_LABEL[st.tool] ? (en ? TOOL_LABEL[st.tool][1] : TOOL_LABEL[st.tool][0]) : st.tool}
                        <span className="ml-2 text-[13px] text-sc-muted">{st.enforcedBy === "agent" ? t("AI 自己决定", "agent's choice") : t("安全规则强制", "enforced by rule")}</span></span>
                      <span className="text-[13px] text-sc-muted tabular-nums">{st.ms} ms</span>
                      {open[st.step] ? <ChevronDown className="w-4 h-4 text-sc-muted" /> : <ChevronRight className="w-4 h-4 text-sc-muted" />}
                    </button>
                    {st.reason && <p className="m-0 pl-7 pb-3 -mt-1 text-[13px] leading-5 text-sc-muted">{t("理由：", "Why: ")}{st.reason}</p>}
                    {open[st.step] && <pre className="ml-7 mb-3 p-3 bg-sc-photo rounded-xl text-xs overflow-auto max-h-60">{JSON.stringify(st.output, null, 2)}</pre>}
                  </li>
                ))}
                {loading && (live.running.length ? live.running : [null]).map((r, k) => (
                  <li key={r ? r.step : `plan-${k}`} className="border-t border-sc-line py-3 flex items-center gap-3 text-[15px] text-sc-ink-2">
                    <Loader2 className="w-4 h-4 animate-spin text-sc-muted" />
                    {r
                      ? <span>{TOOL_LABEL[r.tool] ? (en ? TOOL_LABEL[r.tool][1] : TOOL_LABEL[r.tool][0]) : r.tool}{t("…", "…")}
                          {live.running.length > 1 && <span className="ml-2 text-[13px] text-sc-muted">{t("同时进行", "in parallel")}</span>}
                          {r.reason && <span className="ml-2 text-[13px] text-sc-muted">{t("理由：", "Why: ")}{r.reason}</span>}</span>
                      : <span>{t("AI 正在想下一步…", "Planning the next step…")}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <details className="mt-10">
            <summary className="cursor-pointer text-[13px] text-sc-muted">{t(`审计日志（${audit.length} 条）`, `Audit log (${audit.length})`)}</summary>
            {audit.length === 0 ? <p className="mt-2 text-sm text-sc-muted">{t("还没有记录。", "No entries yet.")}</p> : (
              <ul className="mt-2 m-0 p-0 list-none text-xs max-h-64 overflow-auto">
                {audit.map((a, i) => <li key={i} className="py-1.5 border-t border-sc-line"><span className="text-sc-muted">{a.at}</span> <b className="font-medium">{a.action}</b> {a.detail}</li>)}
              </ul>
            )}
          </details>
        </section>
      </main>
      <footer className="max-w-[1120px] mx-auto px-4 sm:px-8 pb-10 text-[13px] text-sc-muted">
        {t("示范只用虚构数据。AI 只做辅助，最后的临床判断由注册护士作出。", "Demo uses fictional data only. Final clinical judgement rests with a Registered Nurse.")}
      </footer>
    </ScPage>
  );
}
