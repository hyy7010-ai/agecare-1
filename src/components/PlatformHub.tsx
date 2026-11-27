import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PlatformAnalytics, PlatformAuditLogs, PlatformIntegrations, PlatformBilling, PlatformSuperAdmin } from "./PlatformFeatures";
import { useLanguage } from "../contexts/LanguageContext";

export function PlatformHub({ onBack }: { onBack: () => void }) {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState(false);
  const { lang } = useLanguage();
  const T = (a: string, b: string) => (lang === "zh" ? a : b);

  if (activeModule === "analytics") return <PlatformAnalytics onBack={() => setActiveModule(null)} />;
  if (activeModule === "audit") return <PlatformAuditLogs onBack={() => setActiveModule(null)} />;
  if (activeModule === "integrations") return <PlatformIntegrations onBack={() => setActiveModule(null)} />;
  if (activeModule === "billing") return <PlatformBilling onBack={() => setActiveModule(null)} />;
  if (activeModule === "superadmin") return <PlatformSuperAdmin onBack={() => setActiveModule(null)} />;

  const modules = [
    { id: "superadmin", title: T("多院舍超级管理员", "Super admin (multi-tenant)"), desc: T("管理多家院舍和全局权限。", "Manage multiple facilities and global roles.") },
    { id: "analytics", title: T("进阶数据分析", "Advanced analytics"), desc: T("跨院舍的洞察和合规图表。", "Cross-facility insights and compliance charts.") },
    { id: "audit", title: T("审计和合规日志", "Audit and compliance logs"), desc: T("不可更改的系统操作记录，用于法律合规。", "Immutable activity logs for legal compliance.") },
    { id: "integrations", title: T("API 和外部连接", "API and integrations"), desc: T("连接穿戴设备、电子病历和 webhook。", "Connect wearables, EHRs and webhooks.") },
    { id: "billing", title: T("计费和订阅", "Billing and subscription"), desc: T("管理套餐、用量上限和发票。", "Manage tiers, usage limits and invoices.") },
    { id: "export", title: T("数据导入导出", "Data import and export"), desc: T("批量导入长者资料，导出合规报告。", "Bulk import residents, export compliance PDFs.") },
  ];

  return (
    <div>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[15px] text-slate-600 hover:text-slate-900 min-h-11 mb-2">
        <ArrowLeft className="w-4 h-4" />{T("返回看板", "Back to dashboard")}
      </button>
      <h1 className="text-[40px] leading-[48px] font-semibold text-slate-900">Platform Hub</h1>
      <p className="text-base text-slate-500 mt-2 mb-8">{T("管理整个平台的基础设施。", "Manage the core infrastructure of the platform.")}</p>
      {exportNote && (
        <div role="status" className="mb-6 rounded-2xl bg-slate-100 px-5 py-3.5 text-[15px] text-slate-700">
          {T("示范功能：导入导出还没有接上，没有下载文件。", "Demo: import and export are not connected yet, so nothing was downloaded.")}
        </div>
      )}
      <ul className="m-0 p-0 list-none border-b border-slate-200">
        {modules.map((mod) => (
          <li key={mod.id} className="border-t border-slate-200">
            <button
              onClick={() => (mod.id !== "export" ? setActiveModule(mod.id) : setExportNote(true))}
              className="group w-full text-left py-6 flex flex-wrap items-baseline gap-x-6 gap-y-1 hover:bg-slate-100/60 transition-colors px-3 -mx-3 rounded-xl"
            >
              <span className="basis-[260px] shrink-0 font-heading text-[24px] font-semibold text-slate-900">{mod.title}</span>
              <span className="flex-1 basis-[260px] text-[15px] text-slate-600">{mod.desc}</span>
              <span className="text-xl text-amber-600 transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
