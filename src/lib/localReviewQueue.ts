// Local (browser) fallback for the RN review queue.
//
// The demo login accounts are not real Firebase sessions (anonymous auth is
// disabled on the project), so Firestore writes are permission-denied. Without
// a fallback, a caregiver's "Submit for RN review" fails and the RN never sees
// the item, breaking the cross-role demo. When a Firestore write fails we mirror
// the payload here so the whole caregiver -> RN flow works end to end in one
// browser. In a real deployment with real auth, Firestore succeeds and this
// store stays empty.

import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "./firebase";

const KEY = "demo_rnReviewQueue";
const CARE_LOGS_KEY = "demo_careLogs";
const EVENT = "local-review-queue-changed";
const CARE_LOGS_EVENT = "local-care-logs-changed";

export interface LocalReview {
  id: string;
  __local: true;
  [k: string]: any;
}

function read(): LocalReview[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: LocalReview[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

function readCareLogs(): LocalReview[] {
  try {
    return JSON.parse(localStorage.getItem(CARE_LOGS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCareLogs(items: LocalReview[]) {
  localStorage.setItem(CARE_LOGS_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(CARE_LOGS_EVENT));
}

export function addLocalCareLog(payload: Record<string, any>): LocalReview {
  const items = readCareLogs();
  const item: LocalReview = {
    id: `local-log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    __local: true,
    ...payload,
  };
  items.push(item);
  writeCareLogs(items);
  return item;
}

export function getLocalCareLogs(): LocalReview[] {
  return readCareLogs();
}

export async function submitCareLog(payload: Record<string, any>): Promise<void> {
  if (!auth?.currentUser) {
    addLocalCareLog(payload);
    return;
  }
  try {
    await addDoc(collection(db, "dailyCareNotes"), payload);
  } catch (e) {
    console.warn("Firestore care log write failed, using local queue", e);
    addLocalCareLog(payload);
  }
}

export function subscribeLocalCareLogs(cb: (items: LocalReview[]) => void): () => void {
  const handler = () => cb(readCareLogs());
  window.addEventListener(CARE_LOGS_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(CARE_LOGS_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function addLocalReview(payload: Record<string, any>): LocalReview {
  const items = read();
  const item: LocalReview = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    __local: true,
    ...payload,
  };
  items.push(item);
  write(items);
  return item;
}

export function getLocalReviews(): LocalReview[] {
  return read();
}

export function removeLocalReview(id: string) {
  write(read().filter((r) => r.id !== id));
}

// Single entry point for submitting an item to the RN review queue.
// Firestore with offline persistence resolves addDoc optimistically even when
// the server later rejects the write (permission denied), so we cannot rely on
// addDoc throwing. Instead we detect demo mode explicitly: demo logins are not
// real Firebase sessions (auth.currentUser is null), so those writes can never
// reach the server -> route them straight to the local queue. Real authenticated
// sessions go to Firestore.
export async function submitReview(payload: Record<string, any>): Promise<void> {
  if (!auth?.currentUser) {
    addLocalReview(payload);
    return;
  }
  try {
    await addDoc(collection(db, "rnReviewQueue"), payload);
  } catch (e) {
    console.warn("Firestore review write failed, using local queue", e);
    addLocalReview(payload);
  }
}

export function subscribeLocalReviews(cb: (items: LocalReview[]) => void): () => void {
  const handler = () => cb(read());
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
