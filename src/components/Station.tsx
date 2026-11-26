// Nurse station / calls page (/station). What you see depends on who you are:
// everyone (not family) sees calls for them and calls they sent; the nurse also approves notes;
// the manager also sees every call this shift.
import React, { useEffect, useState } from "react";
import { ScPage, Label, useEn, btnPrimary, btnSecondary } from "./ScShell";
import {
  useIdentity, useCalls, isForMe, myReply, replyCall, closeCall, residentLabel, targetLabel, logAudit, Call,
} from "../lib/demoStore";
import { readShift, updateShift, ShiftEntry } from "../lib/shiftLog";

const since = (ts: number, now: number) => {
  const s = Math.max(0, Math.floor((now - ts) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function Station() {
  const { en, t } = useEn();
  const me = useIdentity();
  const calls = useCalls();
  const [now, setNow] = useState(Date.now());
  const [entries, setEntries] = useState<ShiftEntry[]>(readShift());
  const [decision, setDecision] = useState<Record<string, "report" | "no_report">>({});
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  useEffect(() => { setEntries(readShift()); }, [calls]);

  const incoming = calls.filter((c) => isForMe(c, me)).sort((a, b) => Number(!!a.closed) - Number(!!b.closed) || Number(!!b.urgent) - Number(!!a.urgent) || b.ts - a.ts);
  const mine = calls.filter((c) => c.from === me.name).sort((a, b) => b.ts - a.ts);
  const pending = entries.filter((e) => e.kind === "note" && e.pending);
  const isNurse = me.role === "nurse";

  const approve = (e: ShiftEntry, ok: boolean) => {
    const mustCheck = /红线|must check/i.test(e.status || "");
    const d = decision[e.id];
    updateShift(e.id, {
      pending: !ok,
      status: ok ? `护士已确认 RN approved by ${me.name}${d === "report" ? " · 决定上报 will report" : d === "no_report" ? " · 决定不用上报 not reportable" : ""}` : `护士退回 Returned by ${me.name}`,
    });
    if (mustCheck && d) logAudit("RN_REPORTING_DECISION", `${e.id} · ${d === "report" ? "will report" : "not reportable"} · by ${me.name} (nurse station)`);
    logAudit(ok ? "RN_APPROVED" : "RN_RETURNED", `${e.id} · by ${me.name} (nurse station)`);
    setEntries(readShift());
  };

  const CallRow = ({ c, sentByMe }: { c: Call; sentByMe?: boolean }) => {
    const r = myReply(c, me);
    return (
      <div className={`flex flex-col gap-2 ${c.urgent && !c.closed ? "rounded-[20px] bg-sc-red-tint p-5 mb-2" : "py-4 border-t border-sc-line"}`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {c.urgent && !c.closed && <span className="w-2 h-2 rounded-full bg-sc-red self-center" aria-hidden="true" />}
          <span className="text-[17px] font-semibold">
            {sentByMe ? t(`你叫了 ${c.to.map((k) => targetLabel(k, false)).join("、")}`, `You called ${c.to.map((k) => targetLabel(k, true)).join(", ")}`) : t(`${c.from} 叫你`, `${c.from} called you`)}
          </span>
          {c.resident && <span className="text-[15px] text-sc-ink-2">{residentLabel(c.resident)}</span>}
          <span className="ml-auto text-[13px] text-sc-muted tabular-nums">{c.at}</span>
        </div>
        <span className={`text-[15px] leading-6 ${c.urgent && !c.closed ? "text-sc-red-text" : "text-sc-ink-2"}`}>{c.text}</span>
        {c.urgent && !c.closed && (
          <span className="text-[13px] text-sc-red-text">{t("已过", "Elapsed")} <span className="text-[28px] font-light tracking-[-0.03em] tabular-nums align-middle">{since(c.ts, now)}</span></span>
        )}
        {c.replies.length > 0 && (
          <span className="text-[13px] text-sc-muted">
            {c.replies.map((x) => (x.kind === "coming" ? t(`${x.by} ${x.at} 马上到`, `${x.by} on the way ${x.at}`) : t(`${x.by} ${x.at} 已处理`, `${x.by} handled ${x.at}`))).join("　")}
          </span>
        )}
        {c.closed ? <span className="text-[13px] text-sc-muted">{t("已结束", "Closed")}</span> : sentByMe ? (
          <button onClick={() => closeCall(c.id)} className="self-start text-[14px] underline text-sc-ink-2 cursor-pointer">{t("结束这次呼叫", "Close this call")}</button>
        ) : (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {!r && <button onClick={() => replyCall(c.id, me, "coming")} className={`${btnPrimary} min-h-11 ${c.urgent ? "bg-sc-red" : ""}`}>{t("马上到", "On my way")}</button>}
            {r?.kind === "coming" && <span className="self-center text-[15px]">{t("你回了马上到", "You replied: on my way")}</span>}
            <button onClick={() => replyCall(c.id, me, "done")} className={`${btnSecondary} min-h-11 ${c.urgent ? "bg-transparent" : ""}`}>{r ? t("我到了，已处理", "Arrived, handled") : t("已处理", "Handled")}</button>
          </div>
        )}
      </div>
    );
  };

  if (me.role === "family") {
    return (
      <ScPage current="/station">
        <main className="max-w-[1120px] mx-auto px-4 sm:px-8 pt-10 pb-20">
          <p className="text-base text-sc-muted">{t("这一页是员工用的。", "This page is for staff.")} <a href="/residents" className="underline text-sc-ink">{t("看我的家人", "See my family member")}</a></p>
        </main>
      </ScPage>
    );
  }

  return (
    <ScPage current="/station">
      <main className="max-w-[1120px] mx-auto px-4 sm:px-8 pt-8 pb-20 flex flex-col">
        <h1 className="m-0 text-[40px] leading-[48px] font-semibold tracking-[-0.02em]">{me.role === "carer" ? t("呼叫", "Calls") : t("护士台", "Nurse station")}</h1>
        <span className="mt-2 text-base text-sc-muted">
          {me.role === "carer" ? t("同事叫你、你叫别人，都在这里。", "Calls to you and calls you made.")
            : isNurse ? t("叫你的事、等你批准的记录，都在这里。", "Calls for you and notes waiting for your approval.")
            : t("这个班所有的呼叫。", "Every call this shift.")}
        </span>

        <div className="mt-10 flex flex-wrap gap-16 items-start">
          <section className="flex-[1.3_1_440px] min-w-0 flex flex-col">
            <Label>{t(`叫你的　${incoming.filter((c) => !c.closed).length}`, `For you  ${incoming.filter((c) => !c.closed).length}`)}</Label>
            {incoming.length === 0 && (
              <p className="m-0 py-4 border-t border-sc-line text-[15px] leading-6 text-sc-muted">
                {t("还没有人叫你。试试：开一个新分页，右上角换成「护工 Jane」，点「叫人」叫你。", "No calls yet. Try it: open a new tab, switch to Carer Jane, and press Call.")}
              </p>
            )}
            <div className="flex flex-col border-b border-sc-line">{incoming.map((c) => <CallRow key={c.id} c={c} />)}</div>

            {isNurse && (
              <div className="mt-12 flex flex-col">
                <Label>{t(`等你批准的记录　${pending.length}`, `Notes waiting for you  ${pending.length}`)}</Label>
                {pending.length === 0 && <p className="m-0 py-4 border-t border-sc-line text-[15px] text-sc-muted">{t("没有等批准的记录。", "Nothing waiting.")}</p>}
                {pending.map((e) => {
                  const mustCheck = /红线|must check/i.test(e.status || "");
                  const mustReport = /必须上报|must report/i.test(e.status || "");
                  return (
                    <div key={e.id} className={`flex flex-col gap-2 ${mustCheck || mustReport ? "rounded-[20px] bg-sc-red-tint p-5 my-1" : "py-4 border-t border-sc-line"}`}>
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="text-[17px] font-semibold">{residentLabel(e.resident) || e.id}</span>
                        <span className="ml-auto text-[13px] text-sc-muted tabular-nums">{e.at}</span>
                      </div>
                      <span lang="en" className="text-[15px] leading-6">{e.text}</span>
                      {e.status && <span className={`text-[13px] ${mustCheck || mustReport ? "text-sc-red-text" : "text-sc-muted"}`}>{e.status}</span>}
                      {mustCheck && (
                        <fieldset className="border-0 m-0 p-0 flex flex-wrap gap-x-6 text-[15px]">
                          <legend className="sr-only">{t("上报决定", "Reporting decision")}</legend>
                          {([["report", "要上报", "Report it"], ["no_report", "不用上报", "Not reportable"]] as const).map(([k, zh, en2]) => (
                            <label key={k} className="flex items-center gap-2 min-h-10 cursor-pointer">
                              <input type="radio" name={`rep-${e.id}`} checked={decision[e.id] === k} onChange={() => setDecision({ ...decision, [e.id]: k })} className="w-[18px] h-[18px] accent-sc-ink" />{en ? en2 : zh}
                            </label>
                          ))}
                        </fieldset>
                      )}
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <button onClick={() => approve(e, true)} disabled={mustCheck && !decision[e.id]} className={`${btnPrimary} min-h-11`}>{t("批准", "Approve")}</button>
                        <button onClick={() => approve(e, false)} className={`${btnSecondary} min-h-11 bg-transparent`}>{t("退回给护工", "Return to carer")}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="flex-[1_1_320px] min-w-0 flex flex-col">
            {me.role === "manager" ? (
              <>
                <Label>{t(`这个班全部呼叫　${calls.length}`, `All calls this shift  ${calls.length}`)}</Label>
                {calls.length === 0 && <p className="m-0 py-4 border-t border-sc-line text-[15px] text-sc-muted">{t("这个班还没有呼叫。", "No calls yet.")}</p>}
                <div className="flex flex-col border-b border-sc-line">
                  {[...calls].reverse().map((c) => (
                    <div key={c.id} className="py-3 border-t border-sc-line flex flex-col gap-0.5">
                      <span className="text-[13px] text-sc-muted tabular-nums">{c.at}　{c.from} → {c.to.map((k) => targetLabel(k, en)).join(en ? ", " : "、")}{c.urgent && <span className="ml-2 text-sc-red-text font-medium">{t("紧急", "Urgent")}</span>}</span>
                      <span className="text-[15px]">{c.resident ? residentLabel(c.resident) + "　" : ""}{c.text}</span>
                      <span className="text-[13px] text-sc-muted">{c.closed ? t("已结束", "Closed") : c.replies.length ? c.replies.map((x) => `${x.by} ${x.kind === "coming" ? t("马上到", "on the way") : t("已处理", "handled")}`).join("、") : t("还没人回", "No reply yet")}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <Label>{t("你发出的", "Calls you made")}</Label>
                {mine.length === 0 && <p className="m-0 py-4 border-t border-sc-line text-[15px] text-sc-muted">{t("点右上角「叫人」可以叫护士、经理或同事。", "Press Call (top right) to call a nurse, the manager or a colleague.")}</p>}
                <div className="flex flex-col border-b border-sc-line">{mine.map((c) => <CallRow key={c.id} c={c} sentByMe />)}</div>
              </>
            )}
          </aside>
        </div>
        <p className="mt-12 text-[13px] leading-5 text-sc-muted max-w-[640px]">
          {t("示范：呼叫只存在这个浏览器，开几个分页、换不同身份就能看到两边。真正使用时，眼镜和手机会通过服务器互相通知。",
            "Demo: calls live in this browser only. Open a few tabs with different identities to see both sides. In real use, glasses and phones notify each other through the server.")}
        </p>
      </main>
    </ScPage>
  );
}
