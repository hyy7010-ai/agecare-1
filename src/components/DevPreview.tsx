// Development-only preview of logged-in screens with the fictional mock data (no login, no Firebase writes).
// Routed only when import.meta.env.DEV is true, so it is not reachable on the live site.
import React from "react";
import { mockResidents } from "../data";
import { Dashboard } from "./Dashboard";
import { ResidentProfile } from "./ResidentProfile";
import { RNReviewList } from "./RNReviewList";
import { AdminDashboard } from "./AdminDashboard";
import { SirsReviewDashboard } from "./SirsReviewDashboard";
import { FamilyDashboard } from "./FamilyDashboard";
import { RosterComplianceGuard } from "./RosterComplianceGuard";
import { StaffManager } from "./StaffManager";
import { PlatformHub } from "./PlatformHub";
import { SirsReporter } from "./SirsReporter";

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

const REVIEWS: any[] = [
  { id: "r1", residentId: "1", residentName: "Eleanor Vance", room: "Room 201", timestamp: at(0, 11, 42), photoUrl: "",
    aiResult: { observationType: "care_note", observation: "At approximately 11:20, the resident was found sitting on the bathroom floor. She reported mild pain in her right wrist. No head strike was reported.", potentialRiskFlag: "Possible fall with injury", suggestedCarePlan: "大约 11 点 20 分，长者被发现坐在浴室地上，说右手腕有点痛，没有撞到头。" } },
  { id: "r2", residentId: "3", residentName: "Chen Wei", room: "Room 110", timestamp: at(0, 9, 15), photoUrl: "",
    aiResult: { observationType: "skin_tear", observation: "Small superficial skin tear on the left forearm, about 2 cm, edges approximated, no active bleeding.", estimatedSizeOrType: "about 2 cm, category 1", potentialRiskFlag: "Monitor for infection", bodyLocation: "left forearm", suggestedCarePlan: "Clean with saline, apply a non-adherent dressing, review in 48 hours." } },
];
// fictional SIRS events for the preview, stored the same way demo mode stores them
const seedSirs = () => {
  try {
    if (localStorage.getItem("demo_sirsEvents")) return;
    localStorage.setItem("demo_sirsEvents", JSON.stringify([
      { id: "local-s1", timestamp: at(0, 11, 50), status: "pending", priority: 1, reporterName: "Sarah Jenkins",
        description: "Resident found on the bathroom floor at 11:20 with wrist pain. Possible unwitnessed fall.",
        reportInfo: { category: "Unexplained fall with injury", timeframe: "24 hours", uncertaintyFlag: "Possibly Priority 1 if the wrist is fractured. RN to confirm after assessment.",
          autofillReport: { immediateSafetyActions: "RN assessed the wrist; ice applied; GP contacted.", preventiveActions: "Review night-time toileting plan and sensor mat.", regulatorNotification: "Notify the Commission within 24 hours if Priority 1 is confirmed." } } },
      { id: "local-s2", timestamp: at(1, 16, 5), status: "acknowledged", priority: 2, reporterName: "Emily Chen",
        description: "Medication given 2 hours late due to a pharmacy delay.", reportInfo: { category: "Medication incident", timeframe: "30 days" } },
    ]));
  } catch { /* storage off */ }
};

export function DevPreview() {
  seedSirs();
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
        {screen === "rn" && <RNReviewList onBack={noop} pendingReviews={REVIEWS} onConfirmReview={noop} />}
        {screen === "admin" && <AdminDashboard />}
        {screen === "sirs" && <SirsReviewDashboard onBack={noop} />}
        {screen === "family" && <FamilyDashboard resident={mockResidents[0]} />}
        {screen === "roster" && <RosterComplianceGuard onBack={noop} />}
        {screen === "staff" && <StaffManager onBack={noop} />}
        {screen === "platform" && <PlatformHub onBack={noop} />}
        {screen === "sirsform" && <SirsReporter onCancel={noop} onSubmit={noop} residentName="Eleanor Vance" />}
      </main>
    </div>
  );
}
