import React, { useState, useEffect } from "react";
import { ShieldAlert, Search, Filter, Clock, CheckCircle, X, Edit2 } from "lucide-react";
import { Resident, PendingReview } from "../types";
import { useLanguage } from "../contexts/LanguageContext";

interface DashboardProps {
  residents: Resident[];
  onResidentClick: (id: string) => void;
  onNewReport: () => void;
  canLogSirs: boolean;
  isCaregiver?: boolean;
  pendingReviews?: PendingReview[];
  onToggleCareTask?: (id: string, task: "bath" | "meal" | "toilet", currentValue: boolean) => void;
  onQuickLog?: (id: string, task: "bath" | "meal" | "toilet") => void;
  onUpdateCareMinutes?: (id: string, minutes: number) => void;
  onReviewClick?: (review: PendingReview) => void;
}

export function Dashboard({
  residents,
  onResidentClick,
  onNewReport,
  canLogSirs,
  isCaregiver,
  pendingReviews = [],
  onToggleCareTask,
  onQuickLog,
  onUpdateCareMinutes,
  onReviewClick
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReview, setSelectedReview] = useState<PendingReview | null>(null);
  const { t, lang } = useLanguage();

   
  const filteredResidents = residents.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.room?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2);

  const hasDeidentified = filteredResidents.some((r) => (r as any).deidentified);

  const today = new Date().toLocaleDateString(lang === "zh" ? "zh-CN" : "en-AU", { weekday: "long", month: "long", day: "numeric" });
  const dot = (s: "green" | "yellow" | "red") => (s === "green" ? "bg-emerald-500" : s === "yellow" ? "bg-amber-400" : "bg-red-500");

  return (
    <div className="relative z-10 flex flex-col gap-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <span className="text-[13px] text-slate-500">{today}</span>
          <h1 className="mt-1 text-[40px] leading-[48px] font-semibold text-slate-900">
            {t('live_dashboard') as any || "Live Dashboard"}
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            {t('real_time_overview') as any || "Real-time resident wellness overview"}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 absolute left-0 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={(t('find_resident') as any) || "Find resident..."}
              aria-label={(t('find_resident') as any) || "Find resident"}
              className="w-full pl-7 pr-2 py-2.5 bg-transparent border-0 border-b border-slate-300 focus:outline-none focus:border-slate-900 placeholder-slate-400 text-base"
            />
          </div>
          {canLogSirs && (
            <button
              onClick={onNewReport}
              className="hidden md:inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-red-500 text-white font-semibold text-[15px] hover:bg-red-600 transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              {(t('log_sirs_incident') as any) || "Log SIRS Incident"}
            </button>
          )}
        </div>
      </div>

      {hasDeidentified && (
        <div className="flex items-start gap-3 py-4 border-y border-slate-200 text-[14px] leading-6 text-slate-600">
          <svg className="w-4 h-4 mt-1 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="m-0">
            <span className="font-semibold text-slate-900">{lang === "zh" ? "班次数据隔离已开启（澳洲隐私法 APP 11）。" : "Shift isolation is on (Privacy Act, APP 11). "}</span>
            {lang === "zh"
              ? "你这个班只负责 Joyce 和 Arthur（101、102 号房），其他老人的名字和病史已自动隐去。"
              : "You are rostered to Joyce and Arthur (Rooms 101 and 102). Other residents' names and history are hidden."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredResidents.map((resident) => {
          const bath = resident.bathStatus === "done" ? "green" : resident.bathStatus === "due" ? "yellow" : "red";
          const meal = resident.mealStatus === "eaten" ? "green" : resident.mealStatus === "assisted" ? "yellow" : "red";
          const toilet = resident.toiletStatus === "independent" ? "green" : resident.toiletStatus === "assisted" ? "yellow" : "red";
          const items: [string, "green" | "yellow" | "red", string, "bath" | "meal" | "toilet"][] = [
            [t('bath'), bath, t(resident.bathStatus as any) || resident.bathStatus, "bath"],
            [t('meal'), meal, t(resident.mealStatus as any) || resident.mealStatus, "meal"],
            [t('toilet'), toilet, t(resident.toiletStatus as any) || resident.toiletStatus, "toilet"],
          ];
          return (
            <div
              key={resident.id}
              role="button"
              tabIndex={0}
              onClick={() => onResidentClick(resident.id)}
              onKeyDown={(e) => { if (e.key === "Enter") onResidentClick(resident.id); }}
              className="group text-left bg-white rounded-[24px] border border-slate-200 p-7 hover:border-amber-400 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-indigo-50 text-slate-900 flex items-center justify-center text-lg font-heading font-semibold">
                    {getInitials(resident.name)}
                  </div>
                  <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${dot(resident.statusColor as any)}`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-semibold text-[24px] leading-8 text-slate-900 truncate">{resident.name}</h3>
                  <p className="text-[13px] text-slate-500">
                    {t('room_prefix')} {resident.room.replace('Room ', '').replace('房间号 ', '').replace('Kwarto ', '')}
                  </p>
                </div>
                <span className="text-xl text-amber-600 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
              </div>

              <div className="mt-6 grid grid-cols-3 border-y border-slate-200">
                {items.map(([label, st, value, task], i) => (
                  <button
                    key={task}
                    onClick={(e) => { e.stopPropagation(); onQuickLog?.(resident.id, task); }}
                    className={`text-left py-3.5 ${i > 0 ? "pl-4 border-l border-slate-200" : ""} hover:bg-slate-50 transition-colors cursor-pointer`}
                  >
                    <span className="block text-[13px] text-slate-500">{label}</span>
                    <span className="mt-1 flex items-center gap-2 text-[15px] text-slate-900">
                      <span className={`w-2 h-2 rounded-full ${dot(st)}`} aria-hidden="true" />{value}
                    </span>
                  </button>
                ))}
              </div>

              <CareMinutesSlider resident={resident} onUpdate={onUpdateCareMinutes} label={t('care_minutes')} />
            </div>
          );
        })}
      </div>

      {isCaregiver && (
        <div className="flex flex-col">
          <h2 className="text-[26px] font-semibold text-slate-900">{t('my_submitted_observations')}</h2>
          <p className="text-[15px] text-slate-500 mt-1 mb-4">{t('track_observation_status')}</p>
          {pendingReviews.length === 0 ? (
            <p className="m-0 py-4 border-y border-slate-200 text-[15px] text-slate-500">{t('no_pending_observations')}</p>
          ) : (
            <ul className="m-0 p-0 list-none border-b border-slate-200">
              {pendingReviews.map((review) => (
                <li
                  key={review.id}
                  className="py-4 border-t border-slate-200 flex flex-col md:flex-row gap-3 justify-between md:items-center cursor-pointer hover:bg-slate-100/60 transition-colors px-2 -mx-2"
                  onClick={() => setSelectedReview(review)}
                >
                  <div className="min-w-0">
                    <span className="text-[13px] text-slate-500 tabular-nums">{new Date(review.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <h4 className="text-[16px] font-semibold text-slate-900">{review.residentName}</h4>
                    <p className="text-[15px] text-slate-600 mt-0.5 line-clamp-1">{review.aiResult?.observation || "Image submission"}</p>
                  </div>
                  <span className="flex items-center gap-2 text-[14px] text-amber-700 shrink-0">
                    <Clock className="w-4 h-4" />{t('waiting_rn_review')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {selectedReview && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-50 rounded-[24px] max-w-lg w-full overflow-hidden">
            <div className="flex justify-between items-center px-6 pt-6 pb-2">
              <h3 className="text-[22px] font-semibold text-slate-900">Observation Details</h3>
              <button 
                onClick={() => setSelectedReview(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-medium text-slate-800">{selectedReview.residentName}</h4>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedReview.timestamp).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                  <Clock className="w-3.5 h-3.5" />
                  {t('waiting_rn_review')}
                </div>
              </div>
              
              {selectedReview.photoUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center h-48 relative">
                  <img src={selectedReview.photoUrl} alt="Observation" className="absolute inset-0 w-full h-full object-cover" />
                </div>
              )}
              
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h5 className="text-[13px] text-slate-500 mb-2">AI Analysis</h5>
                <p className="text-[15px] text-slate-900 leading-relaxed">
                  {selectedReview.aiResult?.observation || "No analysis available."}
                </p>
                
                {selectedReview.aiResult?.observationType && (
                  <div className="mt-4 pt-4 border-t border-indigo-200/50 grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-xs font-medium text-indigo-500 mb-1">Type</span>
                      <span className="text-sm font-medium text-indigo-900 capitalize">{selectedReview.aiResult.observationType.replace('_', ' ')}</span>
                    </div>
                    {selectedReview.aiResult.bodyLocation && (
                      <div>
                        <span className="block text-xs font-medium text-indigo-500 mb-1">Location</span>
                        <span className="text-sm font-medium text-indigo-900 capitalize">{selectedReview.aiResult.bodyLocation.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-6 pb-6 flex justify-end">
              <button
                onClick={() => setSelectedReview(null)}
                className="min-h-11 px-6 bg-slate-900 text-white rounded-full hover:bg-slate-700 transition-colors font-semibold text-[15px]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CareMinutesSlider({ 
  resident, 
  onUpdate,
  label
}: { 
  resident: Resident; 
  onUpdate?: (id: string, mins: number) => void;
  label: string;
}) {
  const { lang } = useLanguage();
  const [localValue, setLocalValue] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  // Clear local value when upstream resident value updates
  useEffect(() => {
    setLocalValue(null);
  }, [resident.careMinutesToday]);

  const displayValue = localValue !== null ? localValue : resident.careMinutesToday;
  const maxMins = Math.max(resident.careMinutesTarget, 200);

  const handleEditSubmit = () => {
    const val = parseInt(inputValue, 10);
    if (!isNaN(val) && onUpdate) {
      setLocalValue(val);
      onUpdate(resident.id, val);
    }
    setIsEditing(false);
  };

  const done = displayValue / resident.careMinutesTarget >= 1;
  return (
    <div className="mt-6" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-end mb-2">
        <span className="text-[13px] text-slate-500">{label}</span>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') handleEditSubmit();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              autoFocus
              onClick={e => e.stopPropagation()}
              aria-label={label}
              className="w-20 px-2 py-1 text-xl border-0 border-b border-slate-900 bg-transparent outline-none text-right font-light text-slate-900 tabular-nums"
            />
            <span className="text-[15px] text-slate-500">/ {resident.careMinutesTarget}</span>
          </div>
        ) : (
          <button
            className="group/edit flex items-baseline gap-1.5 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setInputValue(displayValue.toString());
              setIsEditing(true);
            }}
          >
            <span className="text-[36px] leading-none font-light tracking-[-0.03em] text-slate-900 tabular-nums">{displayValue}</span>
            <span className="text-[15px] text-slate-500 tabular-nums">/ {resident.careMinutesTarget} {lang === "zh" ? "分钟" : "min"}</span>
            <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover/edit:text-slate-600 transition-colors self-center" />
          </button>
        )}
      </div>
      <div className="relative h-6 w-full flex items-center">
        <div className="absolute left-0 right-0 h-1 my-auto bg-slate-200 rounded-full overflow-hidden pointer-events-none">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-150 ${done ? "bg-emerald-500" : "bg-amber-400"}`}
            style={{ width: `${Math.min((displayValue / maxMins) * 100, 100)}%` }}
          ></div>
        </div>
        <input
          type="range"
          min="0"
          max={maxMins}
          value={displayValue}
          aria-label={label}
          onChange={(e) => {
            e.stopPropagation();
            setLocalValue(parseInt(e.target.value, 10));
          }}
          onMouseUp={(e) => {
            e.stopPropagation();
            if (onUpdate && localValue !== null) {
              onUpdate(resident.id, localValue);
            }
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            if (onUpdate && localValue !== null) {
              onUpdate(resident.id, localValue);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900
            [&::-webkit-slider-thumb]:rounded-full
            [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-white
            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 [&::-moz-range-thumb]:rounded-full"
        />
      </div>
    </div>
  );
}
