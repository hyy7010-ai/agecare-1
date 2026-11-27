import React, { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Edit3,
  ImageOff,
  FileText,
  Mic,
} from "lucide-react";
import { PendingReview } from "../types";

interface RNReviewListProps {
  onBack: () => void;
  pendingReviews: PendingReview[];
  onConfirmReview: (id: string, editedObservation?: string) => void;
}

export function RNReviewList({
  onBack,
  pendingReviews,
  onConfirmReview,
}: RNReviewListProps) {
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [rnLiabilityChecked, setRnLiabilityChecked] = useState(false);
  // The RN may correct the AI draft before signing. We keep the edited text in
  // local state and only persist it on sign-off, so the original AI output is
  // still what gets compared against in the audit log.
  const [editedObservation, setEditedObservation] = useState("");
  const selectedReview = pendingReviews.find((r) => r.id === selectedReviewId);
  const { t, lang } = useLanguage();

  const originalObservation = selectedReview?.aiResult.observation ?? "";
  const wasEdited = editedObservation.trim() !== originalObservation.trim();

  // Load the AI draft into the editor whenever a different review is opened.
  useEffect(() => {
    setEditedObservation(originalObservation);
  }, [selectedReviewId, originalObservation]);

  const closeDetail = () => {
    setSelectedReviewId(null);
    setRnLiabilityChecked(false);
  };

  const handleSignOff = () => {
    if (!rnLiabilityChecked || !selectedReview) return;
    onConfirmReview(selectedReview.id, editedObservation);
    closeDetail();
  };

  const handleRevertToAi = () => setEditedObservation(originalObservation);

  const zh = lang === "zh";
  const hhmm = (ts: any) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  const typeLabel = (k?: string) => {
    if (!k) return zh ? "一般" : "General";
    if (k === "care_note") return zh ? "护理记录" : "Care note";
    return k.replace(/_/g, " ");
  };
  const Field = ({ label, value, warn }: { label: string; value?: string; warn?: boolean }) => (
    <div className="py-3.5 border-t border-slate-200 flex flex-col gap-1">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span className={`text-[15px] ${warn ? "text-amber-700" : "text-slate-900"}`}>{value || "—"}</span>
    </div>
  );

  return (
    <div>
      {!selectedReviewId ? (
        <>
          <div className="flex flex-wrap items-end gap-4 mb-8">
            <div className="flex-1">
              <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[15px] text-slate-600 hover:text-slate-900 min-h-11 mb-2">
                <ArrowLeft className="w-4 h-4" />{t('back_to_dashboard')}
              </button>
              <h1 className="text-[40px] leading-[48px] font-semibold text-slate-900">{t('rn_review_queue')}</h1>
              <p className="text-base text-slate-500 mt-2">{zh ? "AI 写的草稿要护士看过、签字才算数。" : "AI drafts count only after a nurse reviews and signs them."}</p>
            </div>
            <span className="flex items-baseline gap-2">
              <span className="text-[56px] leading-none font-light tracking-[-0.04em] text-slate-900 tabular-nums">{pendingReviews.length}</span>
              <span className="text-[15px] text-slate-500">{zh ? "条等审核" : "waiting"}</span>
            </span>
          </div>

          {pendingReviews.length === 0 ? (
            <p className="m-0 py-6 border-y border-slate-200 text-[16px] text-slate-500">{t('no_pending_reviews')}</p>
          ) : (
            <ul className="m-0 p-0 list-none border-b border-slate-200">
              {pendingReviews.map((review) => (
                <li key={review.id} className="border-t border-slate-200">
                  <button
                    onClick={() => { setSelectedReviewId(review.id); setRnLiabilityChecked(false); }}
                    className="group w-full text-left py-5 flex items-center gap-5 hover:bg-slate-100/60 transition-colors px-3 -mx-3 rounded-xl"
                  >
                    {review.photoUrl ? (
                      <img src={review.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-slate-500">
                        {review.aiResult.observationType === "care_note" ? <FileText className="w-5 h-5" /> : <ImageOff className="w-5 h-5" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <span className="text-[18px] font-semibold text-slate-900">{review.residentName}</span>
                        <span className="text-[14px] text-slate-500">{review.room}</span>
                        <span className="text-[13px] text-slate-500">· {typeLabel(review.aiResult.observationType)}</span>
                      </div>
                      <p className="m-0 mt-1 text-[15px] text-slate-600 truncate">{review.aiResult.observation}</p>
                      {review.aiResult.potentialRiskFlag && review.aiResult.potentialRiskFlag !== "None" && (
                        <span className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />{review.aiResult.potentialRiskFlag}
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] text-slate-500 tabular-nums shrink-0">{hhmm(review.timestamp)}</span>
                    <span className="text-xl text-amber-600 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : selectedReview ? (
        <>
          <button onClick={closeDetail} className="inline-flex items-center gap-1.5 text-[15px] text-slate-600 hover:text-slate-900 min-h-11 mb-2">
            <ArrowLeft className="w-4 h-4" />{t('rn_review_queue')}
          </button>
          <div className="flex flex-wrap items-end gap-4 pb-6 border-b border-slate-200 mb-8">
            <div className="flex-1 min-w-0">
              <span className="text-[13px] text-slate-500">{selectedReview.room} · {typeLabel(selectedReview.aiResult.observationType)} · {hhmm(selectedReview.timestamp)}</span>
              <h1 className="text-[36px] leading-[44px] font-semibold text-slate-900">{selectedReview.residentName}</h1>
            </div>
            <span className="text-[13px] px-3 py-1.5 rounded-full bg-indigo-50 text-amber-800">{t('requires_rn_signature')}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-12 items-start">
            {/* Left: what the carer sent */}
            <div className="flex flex-col gap-5">
              {selectedReview.photoUrl ? (
                <img src={selectedReview.photoUrl} alt={zh ? "护工拍的照片" : "Photo from the carer"} className="w-full rounded-[24px] object-cover max-h-[520px]" />
              ) : selectedReview.aiResult.observationType === "care_note" ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-700"><Mic className="w-5 h-5" /></span>
                    <div>
                      <h3 className="m-0 text-[16px] font-semibold text-slate-900 font-sans">{t('caregiver_voice_intake')}</h3>
                      <p className="m-0 text-[13px] text-slate-500">{t('transcribed_and_compiled')}</p>
                    </div>
                  </div>
                  {selectedReview.aiResult.suggestedCarePlan && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[13px] text-slate-500">{t('native_confirmation_retranslation')}</span>
                      <p className="m-0 text-[16px] leading-7 text-slate-700 border-l-2 border-amber-400 pl-4">{selectedReview.aiResult.suggestedCarePlan}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-64 rounded-[24px] bg-slate-100 flex flex-col items-center justify-center text-slate-500">
                  <ImageOff className="w-8 h-8 mb-2" />
                  <span className="text-[14px]">{t('no_image_available')}</span>
                </div>
              )}
            </div>

            {/* Right: draft, details, sign-off */}
            <div className="flex flex-col">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[13px] text-slate-500">{zh ? "AI 草稿（可以直接改）" : "AI draft (editable)"}</span>
                {wasEdited && <button onClick={handleRevertToAi} className="text-[13px] text-slate-600 underline underline-offset-2">{zh ? "还原 AI 原文" : "Revert to AI draft"}</button>}
              </div>
              <textarea
                value={editedObservation}
                onChange={(e) => setEditedObservation(e.target.value)}
                rows={6}
                aria-label={zh ? "AI 草稿" : "AI draft"}
                className="w-full bg-white p-4 rounded-2xl border border-slate-200 text-[16px] text-slate-900 leading-7 resize-y focus:outline-none focus:border-slate-900"
              />
              {wasEdited && (
                <p className="mt-2 text-[13px] text-amber-700">
                  {zh ? "已修改 AI 原文。签字后，原文和修改都会写进审计日志。" : "AI draft modified. Both versions go to the audit log on sign-off."}
                </p>
              )}

              <div className="mt-6 border-b border-slate-200">
                {selectedReview.aiResult.observationType === "excrement" ? (
                  <>
                    <Field label={zh ? "颜色" : "Colour"} value={selectedReview.aiResult.colour} />
                    <Field label="Bristol Stool Type" value={selectedReview.aiResult.bristolStoolType as any} />
                    <Field label={zh ? "可能的风险" : "Potential risk"} value={selectedReview.aiResult.potentialRiskFlag} warn />
                  </>
                ) : (
                  <>
                    {selectedReview.aiResult.observationType !== "care_note" && <Field label={zh ? "大小 / 类型" : "Size / type"} value={selectedReview.aiResult.estimatedSizeOrType} />}
                    <Field label={zh ? "可能的风险" : "Potential risk"} value={selectedReview.aiResult.potentialRiskFlag} warn />
                    {selectedReview.aiResult.bodyLocation && <Field label={zh ? "部位" : "Location"} value={selectedReview.aiResult.bodyLocation} />}
                  </>
                )}
              </div>

              {selectedReview.aiResult.suggestedCarePlan && selectedReview.aiResult.observationType !== "care_note" && (
                <div className="mt-6 rounded-2xl bg-indigo-50 p-5">
                  <span className="text-[13px] text-amber-800">{t('ai_suggested_care_plan')}</span>
                  <p className="m-0 mt-1 text-[15px] leading-7 text-slate-900 whitespace-pre-wrap">{selectedReview.aiResult.suggestedCarePlan}</p>
                </div>
              )}

              {/* Consent + RN sign-off */}
              <div className="mt-8 flex flex-col gap-4">
                <span className="flex items-start gap-2 text-[13px] text-emerald-700">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-px" />
                  {zh ? "长者隐私知情同意已确认（澳洲 1988 隐私法）" : "Resident consent verified (Privacy Act 1988 / APPs)"}
                </span>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input type="checkbox" checked={rnLiabilityChecked} onChange={(e) => setRnLiabilityChecked(e.target.checked)} className="mt-1 w-[18px] h-[18px] accent-slate-900 cursor-pointer" />
                  <span className="text-[14px] leading-6 text-slate-700">
                    <span className="block text-[15px] font-semibold text-slate-900">{zh ? "注册护士临床复核签字" : "Registered Nurse sign-off"}</span>
                    {zh
                      ? "我确认已根据现有信息，专业复核了这份 AI 辅助生成的记录，并做了必要的修改。这不取代机构政策、注册提供者责任或法律要求。"
                      : "I confirm I have professionally reviewed this AI-assisted record with the information available and made any necessary corrections. This does not replace provider obligations, facility policy or legal requirements."}
                  </span>
                </label>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button onClick={handleSignOff} disabled={!rnLiabilityChecked}
                    className="inline-flex items-center gap-2 min-h-12 px-7 rounded-full bg-slate-900 text-white text-[16px] font-semibold disabled:bg-black/10 disabled:text-slate-500 disabled:cursor-not-allowed">
                    <CheckCircle className="w-4 h-4" />{t('confirm_save_record')}
                  </button>
                  <button onClick={closeDetail} className="inline-flex items-center gap-2 min-h-12 px-6 rounded-full border border-slate-300 bg-white text-slate-900 text-[16px]">
                    <Edit3 className="w-4 h-4" />{zh ? "回到队列，稍后处理" : "Back to queue"}
                  </button>
                </div>
                <p className="m-0 text-[12px] leading-5 text-slate-500">{t("ai_observation_disclaimer")}</p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
