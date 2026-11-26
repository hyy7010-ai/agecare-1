// Shared frame for the public demo pages.
// One language at a time ("EN" / "中文"), a "who am I" switch (no login), a call-for-help button,
// and a banner when someone calls you or answers your call.
import React, { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import {
  IDENTITIES, Role, useIdentity, setIdentity, useCalls, isForMe, myReply, replyCall, markSeen,
  beep, residentLabel,
} from "../lib/demoStore";
import { CallSheet } from "./CallSheet";

export function useEn() {
  const { lang, setLang } = useLanguage();
  const en = lang !== "zh";
  return { en, t: (zh: string, e: string) => (en ? e : zh), toggle: () => setLang(en ? "zh" : "en") };
}

const NAV: Record<Role, { href: string; zh: string; en: string }[]> = {
  carer: [
    { href: "/residents", zh: "老人", en: "Residents" },
    { href: "/agent", zh: "护理记录", en: "Care notes" },
    { href: "/station", zh: "呼叫", en: "Calls" },
    { href: "/handover", zh: "交班单", en: "Handover" },
    { href: "/companion", zh: "陪伴聊天", en: "Companion" },
  ],
  nurse: [
    { href: "/station", zh: "护士台", en: "Nurse station" },
    { href: "/residents", zh: "老人", en: "Residents" },
    { href: "/agent", zh: "护理记录", en: "Care notes" },
    { href: "/handover", zh: "交班单", en: "Handover" },
  ],
  manager: [
    { href: "/station", zh: "护士台", en: "Nurse station" },
    { href: "/residents", zh: "老人", en: "Residents" },
    { href: "/handover", zh: "交班单", en: "Handover" },
  ],
  family: [{ href: "/residents", zh: "我的家人", en: "My family member" }],
};

export function ScPage({ current, children }: { current?: string; children: React.ReactNode }) {
  const { en, t, toggle } = useEn();
  const me = useIdentity();
  const calls = useCalls();
  const [calling, setCalling] = useState(false);

  const incoming = me.role === "family" ? [] : calls
    .filter((c) => !c.closed && isForMe(c, me) && !myReply(c, me))
    .sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || b.ts - a.ts);
  const answers = calls.flatMap((c) => c.from !== me.name ? [] :
    c.replies.filter((r) => !c.seen.includes(`${r.by}-${r.kind}`)).map((r) => ({ c, r })));

  // Beep when a new call for me arrives (not for calls already there when the page opened).
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(incoming.map((c) => c.id));
    if (known.current && [...ids].some((id) => !known.current!.has(id))) beep();
    known.current = ids;
  }, [incoming.map((c) => c.id).join()]);

  const badge = incoming.length;
  const first = incoming[0];

  return (
    <div className="sc min-h-screen" lang={en ? "en" : "zh-CN"}>
      <header className="max-w-[1120px] mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <a href="/demo" className="flex items-center gap-2 text-sc-ink no-underline">
          <img src="/sunrise-care-mark.svg" width={22} height={22} alt="" aria-hidden="true" />
          <span className="text-base font-semibold">Sunrise Care</span>
        </a>
        <nav aria-label={t("主导航", "Main")} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
          {NAV[me.role].map((n) => (
            <a key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}
              className={`relative ${current === n.href ? "text-sc-ink font-semibold" : "text-sc-ink-2 hover:text-sc-ink"}`}>
              {en ? n.en : n.zh}
              {n.href === "/station" && badge > 0 && (
                <span className="absolute -top-1.5 -right-4 min-w-[18px] h-[18px] px-1 rounded-full bg-sc-red text-white text-[11px] font-semibold flex items-center justify-center">{badge}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13px] text-sc-muted">
            {t("我是", "I am")}
            <select value={me.id} onChange={(e) => setIdentity(e.target.value)}
              className="min-h-9 pl-3 pr-2 rounded-full border border-black/15 bg-white text-sc-ink text-[14px] cursor-pointer">
              {IDENTITIES.map((i) => <option key={i.id} value={i.id}>{en ? i.en : i.zh}</option>)}
            </select>
          </label>
          {me.role !== "family" && (
            <button onClick={() => setCalling(true)} className="min-h-9 px-4 rounded-full bg-sc-ink text-white text-[14px] font-semibold cursor-pointer">{t("叫人", "Call")}</button>
          )}
          <button onClick={toggle} className="text-sc-ink font-medium cursor-pointer min-h-9" aria-label={t("Switch to English", "切换到中文")}>
            {en ? "中文" : "EN"}
          </button>
        </div>
      </header>

      {(first || answers.length > 0) && (
        <div className="max-w-[1120px] mx-auto px-4 sm:px-8 flex flex-col gap-2" role="status" aria-live="polite">
          {first && (
            <div className={`rounded-2xl px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 ${first.urgent ? "bg-sc-red-tint" : "bg-sc-photo"}`}>
              {first.urgent && <span className="w-2 h-2 rounded-full bg-sc-red" aria-hidden="true" />}
              <span className="flex-1 min-w-[240px] text-[15px]">
                <b className="font-semibold">{t(`${first.from} 叫你`, `${first.from} is calling you`)}</b>
                {first.resident && <span className="text-sc-ink-2">　{residentLabel(first.resident)}</span>}
                <span className={first.urgent ? "text-sc-red-text" : "text-sc-ink-2"}>　{first.text}</span>
                <span className="text-sc-muted text-[13px]">　{first.at}{incoming.length > 1 ? t(`　还有 ${incoming.length - 1} 个`, `  +${incoming.length - 1} more`) : ""}</span>
              </span>
              <button onClick={() => replyCall(first.id, me, "coming")}
                className={`min-h-10 px-5 rounded-full text-white text-[15px] font-semibold cursor-pointer ${first.urgent ? "bg-sc-red" : "bg-sc-ink"}`}>{t("马上到", "On my way")}</button>
              <a href="/station" className="text-[14px] text-sc-ink-2 underline">{t("查看", "View")}</a>
            </div>
          )}
          {answers.slice(0, 2).map(({ c, r }) => (
            <div key={`${c.id}-${r.by}-${r.kind}`} className="rounded-2xl px-5 py-3 bg-sc-photo flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="flex-1 min-w-[240px] text-[15px]">
                <b className="font-semibold">{r.kind === "coming" ? t(`${r.by} 马上到`, `${r.by} is on the way`) : t(`${r.by} 已处理`, `${r.by} handled it`)}</b>
                <span className="text-sc-ink-2">　{c.resident ? residentLabel(c.resident) + "　" : ""}{c.text}</span>
                <span className="text-sc-muted text-[13px]">　{r.at}</span>
              </span>
              <button onClick={() => markSeen(c.id, `${r.by}-${r.kind}`)} className="text-[14px] text-sc-ink-2 underline cursor-pointer">{t("知道了", "OK")}</button>
            </div>
          ))}
        </div>
      )}

      {children}
      {calling && <CallSheet onClose={() => setCalling(false)} />}
    </div>
  );
}

// Grey 13px section label followed by a hairline list.
export const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`text-[13px] text-sc-muted pb-2 ${className}`}>{children}</div>
);

export const btnPrimary = "inline-flex items-center justify-center gap-2 min-h-12 px-7 rounded-full bg-sc-ink text-white text-base font-semibold cursor-pointer disabled:bg-black/10 disabled:text-sc-muted disabled:cursor-not-allowed";
export const btnSecondary = "inline-flex items-center justify-center gap-2 min-h-12 px-6 rounded-full border border-black/15 bg-white text-sc-ink text-base cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
export const tab = (on: boolean) =>
  `py-1.5 min-h-9 text-[15px] cursor-pointer border-b-2 ${on ? "text-sc-ink font-semibold border-sc-ink" : "text-sc-muted border-transparent hover:text-sc-ink"}`;
export const chip = (on: boolean) =>
  `min-h-9 px-3.5 rounded-full text-[14px] cursor-pointer border ${on ? "bg-sc-ink text-white border-sc-ink" : "bg-white text-sc-ink border-black/15 hover:border-black/30"}`;
