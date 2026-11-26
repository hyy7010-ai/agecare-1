// Shared frame for the public demo pages (/demo /agent /handover).
// One language at a time; "EN" / "中文" switches it (uses the app's saved language).
import React from "react";
import { useLanguage } from "../contexts/LanguageContext";

export function useEn() {
  const { lang, setLang } = useLanguage();
  const en = lang !== "zh";
  return { en, t: (zh: string, e: string) => (en ? e : zh), toggle: () => setLang(en ? "zh" : "en") };
}

const NAV = [
  { href: "/agent", zh: "护理记录", en: "Care notes" },
  { href: "/companion", zh: "陪伴聊天", en: "Companion" },
  { href: "/handover", zh: "交班单", en: "Handover" },
];

export function ScPage({ current, children }: { current?: string; children: React.ReactNode }) {
  const { en, t, toggle } = useEn();
  return (
    <div className="sc min-h-screen" lang={en ? "en" : "zh-CN"}>
      <header className="max-w-[1120px] mx-auto px-4 sm:px-8 py-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <a href="/demo" className="flex items-center gap-2 text-sc-ink no-underline">
          <img src="/sunrise-care-mark.svg" width={22} height={22} alt="" aria-hidden="true" />
          <span className="text-base font-semibold">Sunrise Care</span>
        </a>
        <nav aria-label={t("主导航", "Main")} className="ml-auto flex flex-wrap items-center gap-x-7 gap-y-2 text-[15px]">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} aria-current={current === n.href ? "page" : undefined}
              className={current === n.href ? "text-sc-ink font-semibold" : "text-sc-ink-2 hover:text-sc-ink"}>
              {en ? n.en : n.zh}
            </a>
          ))}
          <button onClick={toggle} className="text-sc-ink font-medium cursor-pointer min-h-9" aria-label={t("Switch to English", "切换到中文")}>
            {en ? "中文" : "EN"}
          </button>
        </nav>
      </header>
      {children}
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
