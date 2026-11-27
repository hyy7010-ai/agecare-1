// Meal plate photo: carer photographs the plate after the meal, AI estimates how much was eaten,
// rough calories and diet flags. Saved as an observation, so a nurse confirms it before it counts.
import React, { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Resident, AIObservationResult } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { shrinkPhoto } from "../lib/demoStore";

type MealResult = { foods: string[]; percentEaten: number; kcalEstimate: number; mealType?: string; flags: string[]; note: string };

export function MealPhoto({ resident, onSave }: { resident: Resident; onSave: (photoUrl: string, ai: AIObservationResult) => void }) {
  const { lang } = useLanguage();
  const zh = lang === "zh";
  const file = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<MealResult | null>(null);
  const [saved, setSaved] = useState(false);

  const analyse = async (f?: File) => {
    if (!f) return;
    setError(""); setResult(null); setSaved(false); setBusy(true);
    try {
      const img = await shrinkPhoto(f, 1024);
      setPhoto(img);
      const r = await fetch("/api/meal", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img, language: lang, allergies: resident.allergies || [] }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
      setResult(j.result);
    } catch (e: any) {
      setError(e.message || (zh ? "分析失败，请再试一次。" : "Analysis failed. Please try again."));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  const save = () => {
    if (!result) return;
    const summary = zh
      ? `吃了约 ${result.percentEaten}%，约 ${result.kcalEstimate} 大卡。${result.note}`
      : `Ate about ${result.percentEaten}%, roughly ${result.kcalEstimate} kcal. ${result.note}`;
    onSave(photo, {
      observationType: "meal",
      observation: summary,
      estimatedSizeOrType: `${result.percentEaten}% · ~${result.kcalEstimate} kcal${result.foods?.length ? " · " + result.foods.join(", ") : ""}`,
      potentialRiskFlag: result.flags?.length ? result.flags.join("; ") : "None",
    });
    setSaved(true);
  };

  const C = 2 * Math.PI * 70;

  return (
    <div className="rounded-[24px] bg-white border border-slate-200 p-6 flex flex-col gap-4">
      <div className="flex items-baseline gap-3">
        <span className="text-[17px] font-semibold text-slate-900 flex-1">{zh ? "拍餐盘" : "Photograph the plate"}</span>
        <span className="text-[13px] text-slate-500">{zh ? "饭后拍一张，AI 估计吃了多少" : "After the meal; AI estimates how much was eaten"}</span>
      </div>

      <input ref={file} id="mealPhoto" type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => analyse(e.target.files?.[0])} />

      {!photo && !busy && (
        <label htmlFor="mealPhoto" className="self-start inline-flex items-center gap-2 min-h-12 px-6 rounded-full bg-slate-900 text-white text-[16px] font-semibold cursor-pointer hover:bg-slate-700">
          <Camera className="w-4 h-4" />{zh ? "拍照 / 选照片" : "Take or choose a photo"}
        </label>
      )}

      {photo && (
        <div className="flex flex-col gap-5">
          <img src={photo} alt={zh ? "餐盘照片" : "Meal plate"} className="w-full h-52 object-cover rounded-2xl" />
          <div className="flex-1 min-w-0">
            {busy && <span className="inline-flex items-center gap-2 text-[15px] text-slate-600"><Loader2 className="w-4 h-4 animate-spin" />{zh ? "正在看餐盘…" : "Looking at the plate…"}</span>}
            {result && (
              <div className="flex items-center gap-5">
                <div className="relative w-[120px] h-[120px] shrink-0">
                  <svg viewBox="0 0 160 160" className="w-full h-full" role="img" aria-label={zh ? `吃了 ${result.percentEaten}%` : `${result.percentEaten}% eaten`}>
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#E7DFD1" strokeWidth="6" />
                    <circle cx="80" cy="80" r="70" fill="none" stroke={result.percentEaten < 50 ? "#D4382C" : "#1F1B16"} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${(C * result.percentEaten) / 100} ${C}`} transform="rotate(-90 80 80)" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[34px] leading-none font-light tracking-[-0.04em] text-slate-900 tabular-nums">{result.percentEaten}<span className="text-[16px]">%</span></span>
                    <span className="text-[12px] text-slate-500">{zh ? "吃了" : "eaten"}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-[13px] text-slate-500">{zh ? "大约热量" : "Rough calories"}</span>
                  <span className="text-[24px] font-light text-slate-900 tabular-nums">~{result.kcalEstimate} <span className="text-[14px] text-slate-500">{zh ? "大卡" : "kcal"}</span></span>
                  {result.foods?.length > 0 && <span className="text-[14px] text-slate-600">{result.foods.join(zh ? "、" : ", ")}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <>
          {result.flags?.length > 0 && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-[15px] text-red-700">
              {result.flags.map((f, i) => <div key={i} className="flex items-start gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" aria-hidden="true" />{f}</div>)}
            </div>
          )}
          <p className="m-0 text-[15px] leading-7 text-slate-800">{result.note}</p>
          <p className="m-0 text-[12px] text-slate-500">{zh ? "这是看照片的估计，不是营养评估。保存后交护士确认。" : "A visual estimate, not a nutrition assessment. Saved results go to the nurse to confirm."}</p>
          <div className="flex flex-wrap gap-3">
            {saved ? (
              <span className="inline-flex items-center min-h-12 text-[15px] text-emerald-700">{zh ? "已保存，等护士确认" : "Saved; waiting for nurse confirmation"}</span>
            ) : (
              <button onClick={save} className="min-h-12 px-7 rounded-full bg-slate-900 text-white text-[16px] font-semibold hover:bg-slate-700">{zh ? "保存，交护士确认" : "Save for nurse review"}</button>
            )}
            <label htmlFor="mealPhoto" className="inline-flex items-center min-h-12 px-6 rounded-full border border-slate-300 bg-white text-[16px] text-slate-900 cursor-pointer hover:border-slate-500">{zh ? "重拍" : "Retake"}</label>
          </div>
        </>
      )}

      {error && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[15px] text-red-600">{error}</span>
          <label htmlFor="mealPhoto" className="text-[15px] underline cursor-pointer">{zh ? "再试一次" : "Try again"}</label>
        </div>
      )}
    </div>
  );
}
