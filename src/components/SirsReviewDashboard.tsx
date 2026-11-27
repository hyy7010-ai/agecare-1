import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { SIRSAlertData } from '../types';
import { getLocalSirsEvents, subscribeLocalSirsEvents, updateLocalSirsEvent } from '../lib/localReviewQueue';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface SirsEvent extends SIRSAlertData {
  id: string;
  timestamp: any;
  status: 'pending' | 'acknowledged' | 'submitted';
  category?: string;
  reporterName?: string;
  description?: string;
}

export function SirsReviewDashboard({ onBack }: { onBack: () => void }) {
  const [events, setEvents] = useState<SirsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SirsEvent | null>(null);
  const { lang } = useLanguage();
  const zh = lang === 'zh';
  const T = (a: string, b: string) => (zh ? a : b);
  
  useEffect(() => {
    // Merge Firestore events with the local demo store (caregiver reports filed in
    // demo mode land in localStorage, since demo logins can't write to Firestore).
    let firestoreEvents: SirsEvent[] = [];
    const toMillis = (t: any) =>
      typeof t === "string"
        ? Date.parse(t)
        : t?.toMillis
        ? t.toMillis()
        : t?.seconds
        ? t.seconds * 1000
        : 0;
    const applyMerge = () => {
      const local = getLocalSirsEvents() as unknown as SirsEvent[];
      const merged = [...local, ...firestoreEvents].sort(
        (a, b) => toMillis(b.timestamp) - toMillis(a.timestamp)
      );
      setEvents(merged);
      setLoading(false);
    };

    applyMerge(); // seed from local immediately so the list isn't stuck "Loading"
    const unsubLocal = subscribeLocalSirsEvents(() => applyMerge());

    let unsubFs = () => {};
    try {
      const q = query(collection(db, "sirsEvents"), orderBy("timestamp", "desc"));
      unsubFs = onSnapshot(
        q,
        (snapshot) => {
          firestoreEvents = [];
          snapshot.forEach((d) => {
            firestoreEvents.push({ id: d.id, ...d.data() } as SirsEvent);
          });
          applyMerge();
        },
        (err) => {
          console.warn("SIRS Firestore snapshot unavailable, using local only", err);
          setLoading(false);
        }
      );
    } catch (e) {
      setLoading(false);
    }

    return () => {
      unsubLocal();
      unsubFs();
    };
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (selectedEvent && selectedEvent.id === id) {
      setSelectedEvent({ ...selectedEvent, status: newStatus as any });
    }
    // Local demo events live in localStorage, not Firestore.
    if (id.startsWith("local-")) {
      updateLocalSirsEvent(id, { status: newStatus });
      return;
    }
    try {
      await updateDoc(doc(db, "sirsEvents", id), {
        status: newStatus
      });
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const when = (ev: SirsEvent) => {
    const t: any = ev.timestamp;
    const d = t?.toDate ? t.toDate() : typeof t === 'string' ? new Date(t) : t?.seconds ? new Date(t.seconds * 1000) : null;
    return d ? d.toLocaleString(zh ? 'zh-CN' : 'en-AU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : T('刚刚', 'Just now');
  };
  const statusText = (st?: string) => st === 'submitted' ? T('已提交监管机构', 'Submitted') : st === 'acknowledged' ? T('处理中', 'In progress') : T('等处理', 'Waiting');
  const statusTone = (st?: string) => st === 'submitted' ? 'text-emerald-700' : st === 'acknowledged' ? 'text-amber-700' : 'text-red-600';
  const title = (ev: SirsEvent) => ev.reportInfo?.category || ev.category || T('事故报告', 'Incident report');
  const actions = selectedEvent ? [selectedEvent.reportInfo?.autofillReport?.immediateSafetyActions, selectedEvent.reportInfo?.autofillReport?.preventiveActions, selectedEvent.reportInfo?.autofillReport?.regulatorNotification].filter(Boolean) : [];

  return (
    <div className="max-w-[1200px] mx-auto">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[15px] text-slate-600 hover:text-slate-900 min-h-11 mb-2">
        <ArrowLeft className="w-4 h-4" />{T('返回看板', 'Back to dashboard')}
      </button>
      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-[40px] leading-[48px] font-semibold text-slate-900">{T('严重事故（SIRS）', 'Serious incidents (SIRS)')}</h1>
          <p className="text-base text-slate-500 mt-2">{T('审核并处理上报的严重事故，按澳洲老年护理质量与安全委员会的要求。', 'Review and action reported serious incidents (ACQSC).')}</p>
        </div>
        <span className="flex items-baseline gap-2">
          <span className="text-[56px] leading-none font-light tracking-[-0.04em] text-slate-900 tabular-nums">{events.filter((e) => e.status !== 'submitted').length}</span>
          <span className="text-[15px] text-slate-500">{T('件未完成', 'open')}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,1fr)_2fr] gap-12 items-start">
        {/* List */}
        <div className="flex flex-col">
          <span className="text-[13px] text-slate-500 pb-2">{T(`事故报告　${events.length}`, `Incident reports  ${events.length}`)}</span>
          {loading ? (
            <p className="m-0 py-4 border-y border-slate-200 text-[15px] text-slate-500">{T('载入中…', 'Loading…')}</p>
          ) : events.length === 0 ? (
            <p className="m-0 py-4 border-y border-slate-200 text-[15px] text-slate-500">{T('还没有 SIRS 报告。', 'No SIRS reports yet.')}</p>
          ) : (
            <div className="flex flex-col border-b border-slate-200 max-h-[640px] overflow-y-auto">
              {events.map((ev) => {
                const on = selectedEvent?.id === ev.id;
                return (
                  <button key={ev.id} onClick={() => setSelectedEvent(ev)} aria-current={on ? 'true' : undefined}
                    className={`text-left py-4 px-3 -mx-3 flex flex-col gap-1 transition-colors ${on ? 'bg-slate-100 rounded-xl' : 'border-t border-slate-200 hover:bg-slate-100/60'}`}>
                    <span className="flex items-center gap-2 text-[13px]">
                      <span className={`w-2 h-2 rounded-full ${ev.priority === 1 ? 'bg-red-500' : 'bg-amber-400'}`} aria-hidden="true" />
                      <span className={ev.priority === 1 ? 'text-red-600 font-medium' : 'text-amber-700'}>{T(`第 ${ev.priority} 级`, `Priority ${ev.priority}`)}</span>
                      <span className={`ml-auto ${statusTone(ev.status)}`}>{statusText(ev.status)}</span>
                    </span>
                    <span className="text-[16px] font-semibold text-slate-900 truncate">{title(ev)}</span>
                    <span className="text-[13px] text-slate-500 tabular-nums">{when(ev)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail */}
        <div className="flex flex-col">
          {selectedEvent ? (
            <>
              <div className={`rounded-[24px] p-6 ${selectedEvent.priority === 1 ? 'bg-red-50' : 'bg-amber-50'}`}>
                <span className="flex items-center gap-2 text-[13px] font-medium text-red-600">
                  <span className={`w-2 h-2 rounded-full ${selectedEvent.priority === 1 ? 'bg-red-500' : 'bg-amber-400'}`} aria-hidden="true" />
                  {T(`第 ${selectedEvent.priority} 级`, `Priority ${selectedEvent.priority}`)}
                  <span className="text-slate-600 font-normal">· {T('期限', 'Due')} {selectedEvent.reportInfo?.timeframe || (selectedEvent.priority === 1 ? T('24 小时', '24 hours') : T('30 天', '30 days'))}</span>
                </span>
                <h2 className="mt-2 text-[30px] leading-[38px] font-semibold text-slate-900">{title(selectedEvent)}</h2>
                <p className="m-0 mt-1 text-[15px] text-slate-600">{T(`报告人：${selectedEvent.reporterName || '员工'}`, `Reported by ${selectedEvent.reporterName || 'staff'}`)}　·　<span className={statusTone(selectedEvent.status)}>{statusText(selectedEvent.status)}</span></p>
              </div>

              <div className="mt-8">
                <span className="text-[13px] text-slate-500">{T('原始描述', 'Original narrative')}</span>
                <p className="m-0 mt-2 text-[16px] leading-7 text-slate-900 whitespace-pre-wrap border-l-2 border-amber-400 pl-4">
                  {selectedEvent.description || selectedEvent.message || selectedEvent.reportInfo?.autofillReport?.whatHappened}
                </p>
              </div>

              <div className="mt-8">
                <span className="text-[13px] text-slate-500">{T('AI 合规分析', 'AI compliance analysis')}</span>
                <p className="m-0 mt-2 text-[15px] leading-7 text-slate-800 whitespace-pre-wrap">{selectedEvent.reportInfo?.uncertaintyFlag || T('根据 ACQSC 指引，分类可信度高。', 'High confidence classification based on ACQSC guidelines.')}</p>
              </div>

              {actions.length > 0 && (
                <div className="mt-8">
                  <span className="text-[13px] text-slate-500">{T('要做的事', 'Required actions')}</span>
                  <ol className="m-0 mt-2 p-0 list-none border-b border-slate-200">
                    {actions.map((a, i) => (
                      <li key={i} className="py-3.5 border-t border-slate-200 flex gap-4 text-[15px] leading-6 text-slate-900">
                        <span className="w-6 shrink-0 text-slate-500 tabular-nums">{i + 1}</span><span>{a}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {selectedEvent.status !== 'submitted' ? (
                  <>
                    <button onClick={() => handleStatusChange(selectedEvent.id, 'submitted')}
                      className="inline-flex items-center gap-2 min-h-12 px-7 rounded-full bg-slate-900 text-white text-[16px] font-semibold hover:bg-slate-700 transition-colors">
                      <CheckCircle className="w-4 h-4" /> {T('提交到 ACQSC', 'Submit to ACQSC')}
                    </button>
                    {selectedEvent.status !== 'acknowledged' && (
                      <button onClick={() => handleStatusChange(selectedEvent.id, 'acknowledged')}
                        className="inline-flex items-center min-h-12 px-6 rounded-full border border-slate-300 bg-white text-slate-900 text-[16px]">
                        {T('标记为处理中', 'Mark in progress')}
                      </button>
                    )}
                  </>
                ) : (
                  <span className="inline-flex items-center gap-2 text-[15px] text-emerald-700"><CheckCircle className="w-4 h-4" /> {T('已正式提交给委员会', 'Officially submitted to the Commission')}</span>
                )}
              </div>
            </>
          ) : (
            <p className="m-0 py-10 border-y border-slate-200 text-[16px] text-slate-500">{T('从左边选一件事故，看详情、AI 分析，再处理。', 'Pick an incident on the left to see details and AI analysis, then act.')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
