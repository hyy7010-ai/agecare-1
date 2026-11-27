import React, { useState, useEffect } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface StaffManagerProps {
  onBack: () => void;
}

export function StaffManager({ onBack }: StaffManagerProps) {
  const [showToast, setShowToast] = useState(false);
  const [dbStaff, setDbStaff] = useState<any[]>([]);
  const { lang } = useLanguage();
  const T = (a: string, b: string) => (lang === "zh" ? a : b);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        if (!db) return;
        const snapshot = await getDocs(collection(db, "users"));
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbStaff(data);
      } catch (e) {
        console.warn("Failed to fetch staff", e);
      }
    };
    fetchStaff();
  }, []);

  const handleExport = () => {
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  const stats = [
    { label: T("护理时长", "Care minutes"), value: "98%", note: T("本周达标", "Target met this week"), tone: "text-emerald-700" },
    { label: T("注册护士 24/7 覆盖", "RN 24/7 coverage"), value: "100%", note: T("排班没有空档", "No gaps in the roster"), tone: "text-slate-500" },
    { label: T("SIRS 事故", "SIRS incidents"), value: "2", note: T("等 ACQSC 审核", "Pending ACQSC review"), tone: "text-amber-700" },
  ];

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[15px] text-slate-600 hover:text-slate-900 min-h-11 mb-2">
        <ArrowLeft className="w-4 h-4" />{T("返回看板", "Back to dashboard")}
      </button>
      <div className="flex flex-wrap items-end gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-[40px] leading-[48px] font-semibold text-slate-900">{T("员工和合规", "Staff and compliance")}</h1>
          <p className="text-base text-slate-500 mt-2">{T("管理团队，生成合规报告。", "Manage the team and generate compliance reports.")}</p>
        </div>
        <button onClick={handleExport} className="inline-flex items-center gap-2 min-h-12 px-6 rounded-full border border-slate-300 bg-white text-slate-900 text-[15px] hover:border-slate-500 transition-colors">
          <Download className="w-4 h-4" />{T("导出合规报告 PDF", "Export compliance PDF")}
        </button>
      </div>

      {showToast && (
        <div role="status" className="mb-6 rounded-2xl bg-slate-100 px-5 py-3.5 text-[15px] text-slate-700">
          {T("示范功能：报告导出还没有接上，没有生成文件。", "Demo: report export is not connected yet, so no file was created.")}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 border-y border-slate-200">
        {stats.map((k, i) => (
          <div key={k.label} className={`py-6 ${i > 0 ? "md:pl-8 md:border-l border-t md:border-t-0 border-slate-200" : ""} ${i < 2 ? "md:pr-8" : ""}`}>
            <span className="text-[13px] text-slate-500">{k.label}</span>
            <div className="mt-2 text-[48px] leading-none font-light tracking-[-0.04em] text-slate-900 tabular-nums">{k.value}</div>
            <span className={`mt-3 block text-[13px] ${k.tone}`}>{k.note}</span>
          </div>
        ))}
      </div>
      <span className="mt-2 block text-[12px] text-slate-400 mb-12">{T("示范数据", "Demo data")}</span>

      <h2 className="text-[26px] font-semibold text-slate-900 mb-4">{T("团队成员", "Team members")}</h2>
      {dbStaff.length === 0 ? (
        <p className="m-0 py-6 border-y border-slate-200 text-[15px] text-slate-500">{T("没有找到员工。", "No staff members found.")}</p>
      ) : (
        <ul className="m-0 p-0 list-none border-b border-slate-200">
          {dbStaff.map((staff) => {
            const staffName = staff.name || staff.displayName || staff.email || "Unknown Staff";
            const init = staffName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
            const on = staff.status === "Active" || staff.status === "On Duty" || !staff.status;
            return (
              <li key={staff.id} className="py-4 border-t border-slate-200 flex items-center gap-4">
                <span className="w-11 h-11 shrink-0 rounded-full bg-indigo-50 text-slate-900 flex items-center justify-center font-heading font-semibold">{init}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[16px] font-semibold text-slate-900 truncate">{staffName}</span>
                  <span className="block text-[13px] text-slate-500 capitalize">{staff.role || "caregiver"}</span>
                </span>
                <span className={`flex items-center gap-2 text-[14px] ${on ? "text-emerald-700" : "text-slate-500"}`}>
                  <span className={`w-2 h-2 rounded-full ${on ? "bg-emerald-500" : "bg-slate-300"}`} aria-hidden="true" />{staff.status || "Active"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
