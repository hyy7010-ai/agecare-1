import React, { useState } from "react";
import { ArrowLeft, BarChart3, ShieldCheck, Zap, CreditCard, Download, Activity, Globe, LayoutDashboard } from "lucide-react";
import { PlatformAnalytics, PlatformAuditLogs, PlatformIntegrations, PlatformBilling, PlatformSuperAdmin } from "./PlatformFeatures";

export function PlatformHub({ onBack }: { onBack: () => void }) {
  const [activeModule, setActiveModule] = useState<string | null>(null);

  if (activeModule === "analytics") return <PlatformAnalytics onBack={() => setActiveModule(null)} />;
  if (activeModule === "audit") return <PlatformAuditLogs onBack={() => setActiveModule(null)} />;
  if (activeModule === "integrations") return <PlatformIntegrations onBack={() => setActiveModule(null)} />;
  if (activeModule === "billing") return <PlatformBilling onBack={() => setActiveModule(null)} />;
  if (activeModule === "superadmin") return <PlatformSuperAdmin onBack={() => setActiveModule(null)} />;

  const modules = [
    { id: "superadmin", title: "Super Admin (Multi-tenant)", icon: <Globe className="w-8 h-8 text-indigo-500" />, desc: "Manage multiple facilities and global RBAC." },
    { id: "analytics", title: "Advanced Analytics", icon: <BarChart3 className="w-8 h-8 text-teal-500" />, desc: "Cross-facility insights, compliance charts." },
    { id: "audit", title: "Audit & Compliance Logs", icon: <ShieldCheck className="w-8 h-8 text-rose-500" />, desc: "Immutable system activity logs for legal compliance." },
    { id: "integrations", title: "API & Integrations", icon: <Zap className="w-8 h-8 text-amber-500" />, desc: "Connect wearables, EHRs, and webhooks." },
    { id: "billing", title: "Billing & Subscription", icon: <CreditCard className="w-8 h-8 text-blue-500" />, desc: "Manage SaaS tiers, usage limits, and invoices." },
    { id: "export", title: "Data Export & Import", icon: <Download className="w-8 h-8 text-emerald-500" />, desc: "Bulk import residents, export compliance PDFs." },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3"><LayoutDashboard className="w-8 h-8 text-indigo-600" /> Platform Hub</h1>
          <p className="text-slate-500 mt-1">Manage the core infrastructure of the SaaS platform.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(mod => (
          <button 
            key={mod.id} 
            onClick={() => mod.id !== "export" ? setActiveModule(mod.id) : alert("Export initiated (CSV downloaded).")}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left group"
          >
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              {mod.icon}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">{mod.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{mod.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
