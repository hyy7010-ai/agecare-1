import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { UserProfile } from "../types";

export interface AuditLogEntry {
  action: string;
  userId: string;
  userEmail: string;
  userRole: string;
  details: string;
  resourceId?: string;
}

export async function logAuditAction(entry: AuditLogEntry) {
  try {
    await addDoc(collection(db, "auditLogs"), {
      ...entry,
      timestamp: serverTimestamp(),
      retentionPolicy: "7_years_aged_care_act" // tag for compliance
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}
