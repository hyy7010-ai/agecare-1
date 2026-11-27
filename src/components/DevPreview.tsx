// Development-only preview of logged-in screens with the fictional mock data (no login, no Firebase writes).
// Routed only when import.meta.env.DEV is true, so it is not reachable on the live site.
import React from "react";
import { mockResidents } from "../data";
import { Dashboard } from "./Dashboard";
import { ResidentProfile } from "./ResidentProfile";

// fictional records for the preview only
const at = (daysAgo: number, h: number, m: number) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(h, m, 0, 0); return d.toISOString(); };
const EVENTS = [
  { timestamp: at(0, 12, 20), aiResult: { observationType: "care_note", observation: "午餐吃了大约一半，说汤太咸。" } },
  { timestamp: at(0, 10, 5), aiResult: { observationType: "care_note", observation: "Assisted with bath, skin intact." } },
  { timestamp: at(0, 8, 30), aiResult: { observationType: "care_note", observation: "早餐进餐正常，喝了一杯热水。" } },
  { timestamp: at(1, 17, 12), aiResult: { observationType: "skin_tear", observation: "右前臂有一条浅表线状小伤口，周围无红肿。" } },
  { timestamp: at(1, 15, 40), aiResult: { observationType: "care_note", observation: "Blood glucose 6.8 mmol/L before afternoon tea." } },
  { timestamp: at(1, 9, 0), aiResult: { observationType: "care_note", observation: "Toilet assisted, no concerns." } },
];

export function DevPreview() {
  const screen = new URLSearchParams(window.location.search).get("s") || "dashboard";
  const noop = () => {};
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 py-10">
        {screen === "dashboard" && (
          <Dashboard residents={mockResidents} onResidentClick={noop} onNewReport={noop} canLogSirs isCaregiver
            pendingReviews={[]} onQuickLog={noop} onUpdateCareMinutes={noop} />
        )}
        {screen === "profile" && (
          <ResidentProfile resident={mockResidents[0]} onBack={noop} onSubmitObservation={noop} isCaregiver
            onQuickLog={noop} timelineEvents={EVENTS} />
        )}
      </main>
    </div>
  );
}
