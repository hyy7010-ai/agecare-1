// Resident timeline + "quick log" (one photo + one sentence, stamped with the time).
import React, { useRef, useState } from "react";
import { useEn, chip } from "./ScShell";
import { useIdentity, useMoments, addMoment, shrinkPhoto } from "../lib/demoStore";

export type Ev = { at: string; kind: string; text: string; sub?: string; red?: boolean; lang?: string; photo?: string };

const hhmm = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

export function QuickLog({ resident }: { resident: string }) {
  const { en, t } = useEn();
  const me = useIdentity();
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState("");
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const pick = async (f?: File) => { if (f) setPhoto(await shrinkPhoto(f)); };
  const listen = () => {
    try {
      const r = new SR();
      r.lang = en ? "en-AU" : "zh-CN";
      r.interimResults = false;
      r.onresult = (e: any) => setText(e.results[0][0].transcript);
      r.onend = () => setListening(false);
      r.onerror = () => setListening(false);
      r.start(); setListening(true);
    } catch { setListening(false); }
  };
  const save = () => {
    addMoment(me, resident, text.trim(), photo || undefined);
    setSaved(hhmm()); setText(""); setPhoto("");
    if (file.current) file.current.value = "";
  };

  return (
    <div className="rounded-[20px] bg-sc-photo p-5 flex flex-col gap-3">
      <div className="flex items-baseline gap-3">
        <span className="text-[17px] font-semibold flex-1">{t("记一笔", "Quick log")}</span>
        <span className="text-[13px] text-sc-muted">{t(`拍一张、说一句，自动记下时间（现在 ${hhmm()}）`, `One photo, one sentence; the time is saved (now ${hhmm()})`)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={file} type="file" accept="image/*" capture="environment" className="sr-only" id="qlPhoto" onChange={(e) => pick(e.target.files?.[0])} />
        <label htmlFor="qlPhoto" className={`${chip(!!photo)} inline-flex items-center gap-2`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          {photo ? t("换一张", "Retake") : t("拍照", "Photo")}
        </label>
        {photo && <img src={photo} alt={t("刚拍的照片", "Photo just taken")} className="h-12 w-16 object-cover rounded-lg" />}
        {SR && (
          <button onClick={listen} disabled={listening} className={`${chip(listening)} inline-flex items-center gap-2`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            {listening ? t("在听…", "Listening…") : t("说一句", "Speak")}
          </button>
        )}
      </div>
      <label htmlFor="qlText" className="sr-only">{t("一句话", "One sentence")}</label>
      <input id="qlText" value={text} onChange={(e) => setText(e.target.value)}
        placeholder={t("例如：午饭吃了一半，说汤太咸", "e.g. Ate half of lunch, said the soup was too salty")}
        className="w-full text-[16px] border-0 border-b border-black/15 py-2 bg-transparent placeholder:text-sc-muted focus:outline-none focus:border-sc-ink" />
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={!text.trim() && !photo}
          className="min-h-11 px-6 rounded-full bg-sc-ink text-white text-[15px] font-semibold cursor-pointer disabled:bg-black/10 disabled:text-sc-muted disabled:cursor-not-allowed">{t("记下", "Save")}</button>
        {saved && <span className="text-[14px] text-sc-ink-2">{t(`${saved} 已记进时间线`, `Saved to the timeline at ${saved}`)}</span>}
      </div>
    </div>
  );
}

export function Timeline({ events }: { events: Ev[] }) {
  const { t } = useEn();
  if (!events.length) return <p className="m-0 py-3.5 border-y border-sc-line text-[15px] text-sc-muted">{t("今天还没有事情。", "Nothing yet today.")}</p>;
  return (
    <ol className="m-0 p-0 pt-4 list-none border-t border-sc-line">
      {events.map((ev, i) => (
        <li key={i} className="flex gap-4">
          <span className="w-11 shrink-0 text-[13px] text-sc-muted tabular-nums pt-px">{ev.at}</span>
          <span className="flex flex-col items-center w-2.5 shrink-0" aria-hidden="true">
            <span className={`mt-1.5 w-2.5 h-2.5 rounded-full ${ev.red ? "bg-sc-red" : "bg-sc-ink"}`} />
            {i < events.length - 1 && <span className="flex-1 w-px bg-sc-line mt-1" />}
          </span>
          <span className="flex-1 min-w-0 pb-6 flex flex-col gap-1">
            <span className={`text-[13px] ${ev.red ? "text-sc-red-text" : "text-sc-muted"}`}>{ev.kind}</span>
            {ev.photo && <img src={ev.photo} alt="" className="w-48 max-w-full rounded-xl" />}
            {ev.text && <span lang={ev.lang} className="text-[15px] leading-6 break-words">{ev.text}</span>}
            {ev.sub && <span className="text-[13px] text-sc-muted">{ev.sub}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

