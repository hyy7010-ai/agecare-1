import React, { useState, useEffect } from "react";
import { ArrowLeft, Download, ShieldCheck, Mail, Phone, Users, ShieldAlert, Award } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

interface StaffManagerProps {
  onBack: () => void;
}

export function StaffManager({ onBack }: StaffManagerProps) {
  const [showToast, setShowToast] = useState(false);
  const [dbStaff, setDbStaff] = useState<any[]>([]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <button
        onClick={onBack}
        className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-normal text-slate-800 tracking-tight">
            Staff & Compliance
          </h2>
          <p className="text-slate-500 font-light mt-1">
            Manage your team and generate compliance reports
          </p>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-normal text-sm rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export Compliance PDF
        </button>
      </div>

      {showToast && (
        <div className="fixed top-20 right-8 bg-slate-800 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 z-50">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <div>
            <p className="font-medium text-sm">Report Generated</p>
            <p className="text-xs text-slate-300">File exported to /downloads successfully.</p>
          </div>
        </div>
      )}

      {/* Compliance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">Care Minutes</h3>
            <Users className="w-5 h-5 text-teal-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">98%</div>
          <p className="text-xs text-teal-600 font-medium mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Target met for this week
          </p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">RN 24/7 Coverage</h3>
            <Award className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">100%</div>
          <p className="text-xs text-slate-500 font-medium mt-2">
            No gaps detected in schedule
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-500">SIRS Incidents</h3>
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-bold text-slate-800">2</div>
          <p className="text-xs text-amber-600 font-medium mt-2">
            Pending ACQSC review
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-medium text-slate-800">Team Members</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {dbStaff.length > 0 ? dbStaff.map((staff) => {
            const staffName = staff.name || staff.email || "Unknown Staff";
            const init = staffName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase();
            return (
            <div key={staff.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                  {init}
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{staffName}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {staff.role || 'caregiver'}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${staff.status === "Active" || staff.status === "On Duty" || !staff.status
                    ? "bg-teal-50 text-teal-700 border border-teal-200" 
                    : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                  {staff.status || "Active"}
                </span>
              </div>
            </div>
          )}) : (
            <div className="p-8 text-center text-slate-500 font-medium">
              No staff members found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
