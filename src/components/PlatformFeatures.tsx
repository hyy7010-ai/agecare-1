import React, { useState } from "react";
import { ArrowLeft, BarChart3, ShieldCheck, Zap, CreditCard, Download, Activity, Globe, CheckCircle2, Lock, Smartphone, Database } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

interface BaseProps {
  onBack: () => void;
}

export function PlatformAnalytics({ onBack }: BaseProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="text-2xl font-bold text-slate-800">Advanced Analytics</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Care Compliance</h3>
            <Activity className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">94.2%</div>
          <p className="text-sm text-emerald-600 mt-2">+2.1% from last month</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Incident Rate</h3>
            <ShieldCheck className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">1.4%</div>
          <p className="text-sm text-emerald-600 mt-2">-0.5% from last month</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Staff Efficiency</h3>
            <BarChart3 className="w-5 h-5 text-teal-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">88%</div>
          <p className="text-sm text-emerald-600 mt-2">Optimal range</p>
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[400px] flex items-center justify-center">
        <p className="text-slate-400">Detailed Analytics Chart Visualization (e.g. D3/Recharts)</p>
      </div>
    </div>
  );
}

export function PlatformAuditLogs({ onBack }: BaseProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="text-2xl font-bold text-slate-800">System Audit Logs</h1>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-semibold text-slate-700">Recent Activity</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">SYS</div>
                <div>
                  <p className="text-sm font-medium text-slate-800">Care Plan Updated</p>
                  <p className="text-xs text-slate-500">By Admin User (ID: admin_883)</p>
                </div>
              </div>
              <div className="text-sm text-slate-500">Today, 10:4{i} AM</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlatformIntegrations({ onBack }: BaseProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="text-2xl font-bold text-slate-800">Integrations & Devices</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><Smartphone className="w-8 h-8" /></div>
          <h3 className="font-bold text-slate-800 mb-2">Smart Wearables</h3>
          <p className="text-sm text-slate-500 mb-4">Connect resident vital monitors and fall detection devices.</p>
          <button className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-xl hover:bg-indigo-100 transition-colors">Configure</button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"><Database className="w-8 h-8" /></div>
          <h3 className="font-bold text-slate-800 mb-2">EHR Systems</h3>
          <p className="text-sm text-slate-500 mb-4">Sync patient records with external health record systems.</p>
          <button className="w-full py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors">Connect API</button>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-4"><Zap className="w-8 h-8" /></div>
          <h3 className="font-bold text-slate-800 mb-2">Webhooks</h3>
          <p className="text-sm text-slate-500 mb-4">Send real-time alerts to external services or SMS gateways.</p>
          <button className="w-full py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors">Manage Endpoints</button>
        </div>
      </div>
    </div>
  );
}

export function PlatformBilling({ onBack }: BaseProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="text-2xl font-bold text-slate-800">Billing & Subscriptions</h1>
      </div>
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8 mb-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Current Plan: Enterprise Platform</h2>
            <p className="text-slate-500 mt-1">Unlimited facilities, full API access, and priority support.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-800">$2,499<span className="text-base font-normal text-slate-500">/mo</span></div>
            <p className="text-sm text-emerald-600 font-medium mt-1">Active - Renews next month</p>
          </div>
        </div>
        <h3 className="font-bold text-slate-800 mb-4">Payment Method</h3>
        <div className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl max-w-md">
          <CreditCard className="w-6 h-6 text-slate-600" />
          <div>
            <p className="font-medium text-slate-800">•••• •••• •••• 4242</p>
            <p className="text-xs text-slate-500">Expires 12/28</p>
          </div>
          <button className="ml-auto text-sm font-medium text-indigo-600 hover:text-indigo-700">Update</button>
        </div>
      </div>
    </div>
  );
}

export function PlatformSuperAdmin({ onBack }: BaseProps) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <h1 className="text-2xl font-bold text-slate-800">Multi-Facility Super Admin</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-500" /> Facilities Managed</h3>
          <div className="space-y-3">
            {["Sunrise Care Home", "Oasis Senior Living", "Pine View Care"].map((name, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50">
                <div>
                  <p className="font-medium text-slate-800">{name}</p>
                  <p className="text-xs text-slate-500">{50 + i * 20} Residents • {15 + i * 5} Staff</p>
                </div>
                <button className="text-indigo-600 text-sm font-medium">Manage</button>
              </div>
            ))}
            <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors">
              + Add New Facility
            </button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Lock className="w-5 h-5 text-rose-500" /> Global Roles & Permissions</h3>
          <p className="text-sm text-slate-500 mb-4">Define platform-wide access controls across all facilities.</p>
          <div className="space-y-2">
            {["Super Administrator", "Facility Manager", "RN (Registered Nurse)", "Caregiver", "Family Member"].map(role => (
              <div key={role} className="flex items-center gap-3 p-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-700">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
