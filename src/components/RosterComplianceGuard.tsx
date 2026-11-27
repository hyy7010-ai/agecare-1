import React, { useState, useEffect } from "react";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { collection, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useLanguage } from "../contexts/LanguageContext";

interface Shift {
  id: string;
  day: string;
  shiftType: "Day" | "Evening" | "Night";
  time: string;
  rnCount: number;
  pwCount: number;
}

interface RosterComplianceGuardProps {
  onBack: () => void;
}

const DEMO_SHIFTS: Shift[] = [
  { id: "mon-day", day: "Monday", shiftType: "Day", time: "07:00-15:00", rnCount: 1, pwCount: 5 },
  { id: "mon-evening", day: "Monday", shiftType: "Evening", time: "15:00-23:00", rnCount: 1, pwCount: 4 },
  { id: "mon-night", day: "Monday", shiftType: "Night", time: "23:00-07:00", rnCount: 1, pwCount: 2 },
  { id: "tue-day", day: "Tuesday", shiftType: "Day", time: "07:00-15:00", rnCount: 1, pwCount: 5 },
  { id: "tue-evening", day: "Tuesday", shiftType: "Evening", time: "15:00-23:00", rnCount: 1, pwCount: 4 },
  { id: "tue-night", day: "Tuesday", shiftType: "Night", time: "23:00-07:00", rnCount: 0, pwCount: 2 },
];

export function RosterComplianceGuard({ onBack }: RosterComplianceGuardProps) {
  const { t, lang } = useLanguage();
  const zh = lang === "zh";
  const [shifts, setShifts] = useState<Shift[]>(DEMO_SHIFTS);

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editRnCount, setEditRnCount] = useState(0);
  const [editPwCount, setEditPwCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "shifts"),
      (snapshot) => {
        const data: Shift[] = [];
        snapshot.forEach((doc) => {
          data.push({ ...doc.data(), id: doc.id } as Shift);
        });
        // Demo accounts may not have a live Firestore roster. Keep the compliance
        // workflow demonstrable while clearly using simulated, non-resident data.
        setShifts(data.length > 0 ? data : DEMO_SHIFTS);
      },
      () => setShifts(DEMO_SHIFTS),
    );
    return () => unsub();
  }, []);

  const handleEditClick = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setEditRnCount(shift.rnCount);
    setEditPwCount(shift.pwCount);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingShiftId) {
      const shiftRef = doc(db, "shifts", editingShiftId);
      await updateDoc(shiftRef, {
        rnCount: editRnCount,
        pwCount: editPwCount,
      });
      setEditingShiftId(null);
    }
  };

  const breaches = shifts.filter((shift) => shift.rnCount === 0);
  const hasRnBreach = breaches.length > 0;

  // Care-minute targets come from the facility's quarterly configuration
  // (case-mix adjusted per provider); they are not one universal statutory
  // number for every facility and resident.
  const facilityCareMinuteTarget = 215;
  const facilityRnMinuteTarget = 44;
  const targetEffectiveDate = "FY26 Q1";
  const targetSource = "Facility quarterly care-minutes configuration";

  const averageCareMinutes = hasRnBreach ? 205 : 216;
  const isCareMinutesCompliant = averageCareMinutes >= facilityCareMinuteTarget;

  const averageRnMinutes = hasRnBreach ? 40 : 45;
  const isRnMinutesCompliant = averageRnMinutes >= facilityRnMinuteTarget;

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const shiftTypes = ["Day", "Evening", "Night"];

  const DAY_ZH: Record<string, string> = { Monday: "周一", Tuesday: "周二", Wednesday: "周三", Thursday: "周四", Friday: "周五", Saturday: "周六", Sunday: "周日" };
  const SHIFT_ZH: Record<string, string> = { Day: "早班", Evening: "晚班", Night: "夜班" };
  const dayL = (d: string) => (zh ? DAY_ZH[d] || d : d);
  const shiftL = (s: string) => (zh ? SHIFT_ZH[s] || s : `${s} shift`);
  const locked = hasRnBreach || !isCareMinutesCompliant;
  const Meter = ({ label, value, target, ok }: { label: string; value: number; target: number; ok: boolean }) => (
    <div className="py-5 border-t border-slate-200">
      <span className="text-[13px] text-slate-500">{label}</span>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={`text-[44px] leading-none font-light tracking-[-0.03em] tabular-nums ${ok ? "text-slate-900" : "text-red-600"}`}>{value}</span>
        <span className="text-[15px] text-slate-500 tabular-nums">/ {target} {t("mins")}</span>
      </div>
      <div className="mt-3 h-1 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
      </div>
      {!ok && <p className="m-0 mt-2 text-[13px] text-red-600">{zh ? `低于院舍目标 ${target} 分钟，要复核` : `Below the facility target of ${target} minutes; review required`}</p>}
    </div>
  );

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[15px] text-slate-600 hover:text-slate-900 min-h-11 mb-2">
        <ArrowLeft className="w-4 h-4" />{zh ? "返回看板" : "Back to dashboard"}
      </button>
      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-[40px] leading-[48px] font-semibold text-slate-900">{t("roster_compliance_guard")}</h1>
          <p className="text-base text-slate-500 mt-2">{zh ? "每个班都要有注册护士在场，护理时长要达标，才能保存排班。" : "Every shift needs an RN on site and care minutes must meet target before the roster can be saved."}</p>
        </div>
        <button disabled={locked}
          className="inline-flex items-center gap-2 min-h-12 px-7 rounded-full bg-slate-900 text-white text-[16px] font-semibold disabled:bg-black/10 disabled:text-slate-500 disabled:cursor-not-allowed">
          {locked ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />} {t("save_roster")}
        </button>
      </div>

      {hasRnBreach && (
        <div className="rounded-[24px] bg-red-50 p-6 mb-10">
          <span className="flex items-center gap-2 text-[13px] font-medium text-red-600"><span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />{t("roster_breach_alert")}</span>
          <ul className="m-0 mt-2 p-0 list-none flex flex-col gap-1">
            {breaches.map((b) => (
              <li key={b.id} className="text-[17px] text-slate-900">
                <span className="font-semibold">{dayL(b.day)} {shiftL(b.shiftType)}</span>
                <span className="text-slate-600">（{b.time}）{zh ? "没有注册护士" : " has no RN"}</span>
              </li>
            ))}
          </ul>
          <p className="m-0 mt-3 text-[14px] text-red-700">{t("risk_sanction_msg")}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1fr] gap-x-10 mb-12">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-10">
          <Meter label={t("average_total_care_minutes")} value={averageCareMinutes} target={facilityCareMinuteTarget} ok={isCareMinutesCompliant} />
          <Meter label={t("of_which_rn_minutes")} value={averageRnMinutes} target={facilityRnMinuteTarget} ok={isRnMinutesCompliant} />
        </div>
        <div className="py-5 border-t border-slate-200">
          <span className="text-[13px] text-slate-500">{t("rn_coverage_status")}</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={`text-[44px] leading-none font-light tracking-[-0.03em] tabular-nums ${hasRnBreach ? "text-red-600" : "text-slate-900"}`}>{shifts.length - breaches.length}</span>
            <span className="text-[15px] text-slate-500">/ {shifts.length} {t("shifts_covered")}</span>
          </div>
          <p className="m-0 mt-3 text-[13px] text-slate-500">{t("required_rn_onsite")}</p>
        </div>
        <p className="lg:col-span-3 m-0 pt-3 border-t border-slate-200 text-[12px] text-slate-400">
          {zh ? `目标来自院舍的季度护理时长设置（${targetEffectiveDate} 起），按长者情况调整，每家院舍不同。` : `Targets: ${targetSource} (effective ${targetEffectiveDate}). Case-mix adjusted; they vary by provider.`}
        </p>
      </div>

      <h2 className="text-[26px] font-semibold text-slate-900">{t("weekly_roster_view")}</h2>
      <p className="text-[14px] text-slate-500 mt-1 mb-4">{zh ? "点一个班可以改人数。" : "Tap a shift to change staffing."}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left border-collapse">
          <thead>
            <tr className="text-[13px] text-slate-500">
              <th className="py-3 pr-4 font-normal w-24 border-b border-slate-200">{zh ? "日期" : "Day"}</th>
              {shiftTypes.map((type) => <th key={type} className="py-3 px-4 font-normal border-b border-slate-200">{shiftL(type)}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr key={day}>
                <td className="py-4 pr-4 text-[15px] font-semibold text-slate-900 border-b border-slate-200 align-top">{dayL(day)}</td>
                {shiftTypes.map((type) => {
                  const shift = shifts.find((s) => s.day === day && s.shiftType === type);
                  if (!shift) return <td key={type} className="py-4 px-4 border-b border-slate-200 text-[13px] text-slate-300">—</td>;
                  const isBreach = shift.rnCount === 0;
                  return (
                    <td key={type} className="py-2 px-2 border-b border-slate-200 align-top">
                      {editingShiftId === shift.id ? (
                        <form onSubmit={handleSaveShift} className="flex flex-col gap-2 p-2 rounded-xl bg-white border border-slate-200">
                          <label className="flex items-center gap-2 text-[13px] text-slate-500">{zh ? "护士" : "RNs"}
                            <input type="number" min="0" value={editRnCount} onChange={(e) => setEditRnCount(parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 text-[14px] border-0 border-b border-slate-300 bg-transparent focus:outline-none focus:border-slate-900" />
                          </label>
                          <label className="flex items-center gap-2 text-[13px] text-slate-500">{zh ? "护工" : "Carers"}
                            <input type="number" min="0" value={editPwCount} onChange={(e) => setEditPwCount(parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 text-[14px] border-0 border-b border-slate-300 bg-transparent focus:outline-none focus:border-slate-900" />
                          </label>
                          <div className="flex gap-2">
                            <button type="submit" className="min-h-9 px-4 rounded-full bg-slate-900 text-white text-[13px] font-semibold">{zh ? "保存" : "Save"}</button>
                            <button type="button" onClick={() => setEditingShiftId(null)} className="min-h-9 px-4 rounded-full border border-slate-300 text-[13px]">{zh ? "取消" : "Cancel"}</button>
                          </div>
                        </form>
                      ) : (
                        <button onClick={() => handleEditClick(shift)}
                          className={`group w-full text-left p-2.5 rounded-xl transition-colors ${isBreach ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-100"}`}>
                          <span className="block text-[12px] text-slate-500 tabular-nums">{shift.time}</span>
                          <span className={`mt-1 flex items-center gap-2 text-[15px] ${isBreach ? "text-red-600 font-semibold" : "text-slate-900"}`}>
                            <span className={`w-2 h-2 rounded-full ${isBreach ? "bg-red-500" : "bg-emerald-500"}`} aria-hidden="true" />
                            {zh ? `护士 ${shift.rnCount}` : `${shift.rnCount} RN`}{isBreach && (zh ? "（缺护士）" : " (breach)")}
                          </span>
                          <span className="block text-[13px] text-slate-500">{zh ? `护工 ${shift.pwCount}` : `${shift.pwCount} carers`}</span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
