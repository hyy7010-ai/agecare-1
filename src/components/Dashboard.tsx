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

  return (
    <div className="space-y-8 font-light relative z-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight font-heading">
            {t('live_dashboard') as any || "Live Dashboard"}
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-base">
            {t('real_time_overview') as any || "Real-time resident wellness overview"}
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={(t('find_resident') as any) || "Find resident..."}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium placeholder-slate-400 text-base shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]"
            />
          </div>
          {canLogSirs && (
            <button
              onClick={onNewReport}
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-rose-600 text-white font-bold text-lg rounded-xl hover:bg-rose-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:ring-4 focus:ring-rose-500/30"
            >
              <ShieldAlert className="w-6 h-6" />
              {(t('log_sirs_incident') as any) || "Log SIRS Incident"}
            </button>
          )}
        </div>
      </div>

      {hasDeidentified && (
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100/30 border border-indigo-100 rounded-3xl p-6 flex items-start gap-5 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center shrink-0 border border-indigo-200 shadow-inner">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h4 className="font-bold text-indigo-950 text-base flex items-center gap-2">
              <span>{lang === "zh" ? "🔒 澳大利亚隐私法（APP 11）班次数据隔离保护中" : "🔒 Aussie Privacy Act (APP 11) Least-Privilege Shift Isolation Active"}</span>
              <span className="text-[10px] uppercase tracking-wider bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold">Compliant</span>
            </h4>
            <p className="text-sm text-indigo-800/80 mt-1 font-medium leading-relaxed">
              {lang === "zh"
                ? "系统当前以注册护士(RN)及护工排班授权限制。您作为护工仅分配了 Joyce 和 Arthur (Room 101/102) 的班次。其他不属于当前班次的居民个人信息已被自动去标识化，以保障隐私合规并防范未经授权的 PII 数据泄露。"
                : "The system restricts caregiver access based on rostered shifts. You are only rostered to Joyce and Arthur (Room 101/102). Other residents' names and clinical history have been dynamically de-identified to prevent unauthorized PII disclosure."}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {filteredResidents.map((resident) => (
          <div
            key={resident.id}
            onClick={() => onResidentClick(resident.id)}
            className="group block w-full text-left bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-indigo-500/30 relative overflow-hidden"
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-indigo-50/0 group-hover:from-indigo-50/50 group-hover:to-white/50 transition-colors duration-500 -z-10" />
            
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-700 flex items-center justify-center text-xl font-bold border border-indigo-100/50 shadow-sm shadow-indigo-100/50 group-hover:scale-105 transition-transform duration-300">
                    {getInitials(resident.name)}
                  </div>
                  <div
                    className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-[3px] border-white shadow-sm ${
                      resident.statusColor === "red"
                        ? "bg-rose-500"
                        : resident.statusColor === "yellow"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                  ></div>
                </div>
                <div>
                  <h3 className="font-bold text-2xl text-slate-800 font-heading tracking-tight group-hover:text-indigo-700 transition-colors">
                    {resident.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wider">
                    {t('room_prefix')} {resident.room.replace('Room ', '').replace('房间号 ', '').replace('Kwarto ', '')}
                  </p>
                </div>
              </div>
            </div>

            {/* Status indicators */}
            <div className="grid grid-cols-3 gap-3 mt-2 pt-4 border-t border-slate-100">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500 uppercase font-medium tracking-wider">
                  {t('bath')}
                </span>
                <StatusBadge
                  status={
                    resident.bathStatus === "done"
                      ? "green"
                      : resident.bathStatus === "due"
                        ? "yellow"
                        : "red"
                  }
                  label={t(resident.bathStatus as any) || resident.bathStatus}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickLog) {
                      onQuickLog(resident.id, "bath");
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500 uppercase font-medium tracking-wider">
                  {t('meal')}
                </span>
                <StatusBadge
                  status={
                    resident.mealStatus === "eaten"
                      ? "green"
                      : resident.mealStatus === "assisted"
                        ? "yellow"
                        : "red"
                  }
                  label={t(resident.mealStatus as any) || resident.mealStatus}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickLog) {
                      onQuickLog(resident.id, "meal");
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-slate-500 uppercase font-medium tracking-wider">
                  {t('toilet')}
                </span>
                <StatusBadge
                  status={
                    resident.toiletStatus === "independent"
                      ? "green"
                      : resident.toiletStatus === "assisted"
                        ? "yellow"
                        : "red"
                  }
                  label={t(resident.toiletStatus as any) || resident.toiletStatus}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onQuickLog) {
                      onQuickLog(resident.id, "toilet");
                    }
                  }}
                />
              </div>
            </div>

            <CareMinutesSlider 
              resident={resident} 
              onUpdate={onUpdateCareMinutes}
              label={t('care_minutes')}
            />
          </div>
        ))}
      </div>

      {isCaregiver && (
        <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 font-heading tracking-tight">{t('my_submitted_observations')}</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">{t('track_observation_status')}</p>
          </div>
          <div className="p-0">
            {pendingReviews.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-light text-sm">
                {t('no_pending_observations')}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingReviews.map((review) => (
                  <li 
                    key={review.id} 
                    className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row gap-4 justify-between items-start md:items-center cursor-pointer hover:shadow-sm"
                    onClick={() => setSelectedReview(review)}
                  >
                    <div>
                      <h4 className="font-medium text-slate-800">{review.residentName}</h4>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-1">{review.aiResult?.observation || "Image submission"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {new Date(review.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-sm font-medium shrink-0">
                      <Clock className="w-4 h-4" />
                      {t('waiting_rn_review')}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
      {selectedReview && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Observation Details</h3>
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
              
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <h5 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-2">AI Analysis</h5>
                <p className="text-sm text-indigo-900 leading-relaxed">
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
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedReview(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium text-sm shadow-sm"
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

  return (
    <div className="mt-8 pt-6 border-t border-slate-100/60" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-end mb-3">
        <span className="text-sm text-slate-500 font-semibold tracking-wider uppercase">{label}</span>
        <div className="flex items-center gap-2">
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
                className="w-16 px-2 py-1 text-sm border border-indigo-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold text-slate-800"
              />
              <span className="text-base text-slate-400 font-medium">/ {resident.careMinutesTarget}m</span>
            </div>
          ) : (
            <div 
              className="group/edit flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 px-2 py-1 -mr-2 rounded-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setInputValue(displayValue.toString());
                setIsEditing(true);
              }}
            >
              <span className="font-bold text-slate-800 text-xl font-heading">
                {displayValue} <span className="text-base text-slate-400 font-medium">/ {resident.careMinutesTarget}m</span>
              </span>
              <Edit2 className="w-4 h-4 text-slate-300 group-hover/edit:text-indigo-500 transition-colors" />
            </div>
          )}
        </div>
      </div>
      <div className="relative h-6 w-full group flex items-center">
        <div className="absolute left-0 right-0 h-3 my-auto bg-slate-100/80 rounded-full overflow-hidden shadow-inner pointer-events-none">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-150 ${
              displayValue / resident.careMinutesTarget >= 1
                ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                : "bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"
            }`}
            style={{
              width: `${Math.min((displayValue / maxMins) * 100, 100)}%`,
            }}
          ></div>
        </div>
        <input
          type="range"
          min="0"
          max={maxMins}
          value={displayValue}
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
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-500 
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-125
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-white 
            [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-indigo-500 [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:transition-transform [&::-moz-range-thumb]:hover:scale-125"
        />
      </div>
    </div>
  );
}

function StatusBadge({ status, label, onClick }: { status: "green" | "yellow" | "red", label: string, onClick?: (e: React.MouseEvent) => void }) {
  const colorClasses = 
    status === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : status === "yellow"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-700 border-red-200";

  return (
    <div 
      onClick={onClick}
      className={`px-2.5 py-1 rounded-md border text-xs font-semibold uppercase tracking-wider text-center w-full shadow-sm ${onClick ? 'cursor-pointer hover:brightness-95 transition-all active:scale-95' : ''} ${colorClasses}`}
    >
      {label}
    </div>
  );
}
