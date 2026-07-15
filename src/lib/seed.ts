import {
  collection,
  query,
  getDocs,
  limit,
  setDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { mockRoster } from "../data";

export async function seedDatabaseIfNeeded() {
  try {
    const shiftsRef = collection(db, "shifts");
    const qShifts = query(shiftsRef, limit(1));
    const snapshotShifts = await getDocs(qShifts);

    if (snapshotShifts.empty) {
      console.log("Seeding database with mock shifts...");
      for (const shift of mockRoster) {
        const docRef = doc(db, "shifts", shift.id);
        await setDoc(docRef, shift);
      }
    }
  } catch (err) {
    console.warn("Failed to seed database:", err);
  }
}
