// "Call for help" sheet: pick who, which resident, what for. After sending, shows replies live.
import React, { useEffect, useState } from "react";
import { TARGETS, RESIDENTS, useIdentity, useCalls, sendCall, closeCall, targetLabel } from "../lib/demoStore";
import { useEn, Label, chip, btnPrimary, btnSecondary } from "./ScShell";

const QUICK = [
  { zh: "要两个人扶", en: "Need two people to help move", urgent: false },
  { zh: "老人说疼", en: "Resident says it hurts", urgent: false },
  { zh: "来帮我一下", en: "Can you help me for a minute", urgent: false },
  { zh: "老人摔倒了", en: "Resident has fallen", urgent: true },
];

export function CallSheet({ onClose }: { onClose: () => void }) {
  const { en, t } = useEn();
  const me = useIdentity();
  const calls = useCalls();
  const [to, setTo] = useState<string[]>([]);
  const [resident, setResident] = useState("");
  const [text, setText] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [sentId, setSentId] = useState("");

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const targets = TARGETS.filter((x) => x.key !== me.name && x.key !== me.role);
  const toggle = (k: string) => setTo((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  const sent = calls.find((c) => c.id === sentId);

  const send = () => {
    const c = sendCall(me, to, text.trim(), resident || undefined, urgent);
    setSentId(c.id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t("叫人帮忙", "Call for help")} onClick={(e) => e.stopPropagation()}
        className="sc w-full sm:max-w-[520px] max-h-[92vh] overflow-y-auto rounded-t-[24px] sm:rounded-[24px] bg-white p-6 flex flex-col gap-5">
        <div className="flex items-baseline">
          <h2 className="m-0 text-[22px] font-semibold flex-1">{t("叫人帮忙", "Call for help")}</h2>
          <button onClick={onClose} className="text-[14px] text-sc-ink-2 underline cursor-pointer">{t("关闭", "Close")}</button>
        </div>

        {!sent ? (
          <>
            <div>
              <Label>{t("叫谁（可以选几个）", "Who (pick one or more)")}</Label>
              <div className="flex flex-wrap gap-2">
                {targets.map((x) => <button key={x.key} onClick={() => toggle(x.key)} aria-pressed={to.includes(x.key)} className={chip(to.includes(x.key))}>{en ? x.en : x.zh}</button>)}
              </div>
            </div>
            <div>
              <Label>{t("哪位老人", "Which resident")}</Label>
              <div className="flex flex-wrap gap-2">
                {RESIDENTS.map((r) => (
                  <button key={r.name} onClick={() => setResident(resident === r.name ? "" : r.name)} aria-pressed={resident === r.name} className={chip(resident === r.name)}>
                    {r.room} {t("号房", "·")} {r.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("什么事", "What for")}</Label>
              <div className="flex flex-wrap gap-2 mb-3">
                {QUICK.map((q) => (
                  <button key={q.zh} onClick={() => { setText(en ? q.en : q.zh); setUrgent(q.urgent); }}
                    className={`min-h-9 px-3.5 rounded-full text-[14px] cursor-pointer border ${q.urgent ? "border-sc-red/40 text-sc-red-text" : "border-black/15 text-sc-ink"} bg-white`}>{en ? q.en : q.zh}</button>
                ))}
              </div>
              <label htmlFor="callText" className="sr-only">{t("说明", "Details")}</label>
              <input id="callText" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("一句话说明", "One line")}
                className="w-full text-[17px] border-0 border-b border-sc-line py-2 bg-transparent placeholder:text-sc-muted focus:outline-none focus:border-sc-ink" />
              <label className="mt-3 flex items-center gap-2 text-[15px] cursor-pointer min-h-10">
                <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="w-[18px] h-[18px] accent-sc-red" />
                <span className={urgent ? "text-sc-red-text font-medium" : ""}>{t("紧急", "Urgent")}</span>
              </label>
            </div>
            <button onClick={send} disabled={!to.length || !text.trim()}
              className={`${btnPrimary} w-full ${urgent ? "bg-sc-red" : ""}`}>{t("发出", "Send")}</button>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-[17px]">
              {t(`已发给 ${sent.to.map((k) => targetLabel(k, false)).join("、")}。`, `Sent to ${sent.to.map((k) => targetLabel(k, true)).join(", ")}.`)}
            </p>
            <div className="flex flex-col border-b border-sc-line">
              {sent.replies.length === 0 && <div className="py-3 border-t border-sc-line text-[15px] text-sc-muted">{t("等回复…", "Waiting for a reply…")}</div>}
              {sent.replies.map((r, i) => (
                <div key={i} className="py-3 border-t border-sc-line text-[15px] flex gap-3">
                  <span className="flex-1 font-medium">{r.kind === "coming" ? t(`${r.by} 马上到`, `${r.by} is on the way`) : t(`${r.by} 已处理`, `${r.by} handled it`)}</span>
                  <span className="text-sc-muted tabular-nums">{r.at}</span>
                </div>
              ))}
            </div>
            <p className="m-0 text-[13px] leading-5 text-sc-muted">{t("想看对方那边：开一个新分页，右上角「我是」换成对方。", "To see the other side: open a new tab and switch “I am” to that person.")}</p>
            <div className="flex gap-2.5">
              <button onClick={onClose} className={`${btnPrimary} flex-1`}>{t("好", "OK")}</button>
              {!sent.closed && <button onClick={() => { closeCall(sent.id); onClose(); }} className={`${btnSecondary} flex-1`}>{t("不用了", "Cancel call")}</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
