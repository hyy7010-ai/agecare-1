// Demo-only state for the public pages: who you are (no login) and calls for help.
// Stored in this browser; other tabs update live through the "storage" event. Fictional people only.
import { useSyncExternalStore } from "react";
import { addShift, updateShift } from "./shiftLog";

function makeStore<T>(key: string, parse: (raw: string | null) => T, perTab = false) {
  const store = () => (perTab ? sessionStorage : localStorage);
  const ev = `sc:${key}`;
  let lastRaw: string | null | undefined;
  let last: T;
  const get = () => {
    let raw: string | null = null;
    try { raw = store().getItem(key); } catch { /* storage off */ }
    if (raw !== lastRaw) { lastRaw = raw; last = parse(raw); }
    return last;
  };
  const subscribe = (cb: () => void) => {
    const h = (e: Event) => { if (!(e instanceof StorageEvent) || e.key === key) cb(); };
    window.addEventListener("storage", h);
    window.addEventListener(ev, h);
    return () => { window.removeEventListener("storage", h); window.removeEventListener(ev, h); };
  };
  const set = (raw: string) => {
    try { store().setItem(key, raw); } catch { /* storage off */ }
    window.dispatchEvent(new Event(ev));
  };
  return { get, subscribe, set };
}

// ---------- who am I ----------
export type Role = "carer" | "nurse" | "manager" | "family";
export type Identity = { id: string; role: Role; name: string; zh: string; en: string; resident?: string };

export const IDENTITIES: Identity[] = [
  { id: "carer-jane", role: "carer", name: "Jane", zh: "护工 Jane", en: "Carer Jane" },
  { id: "carer-anna", role: "carer", name: "Anna", zh: "护工 Anna", en: "Carer Anna" },
  { id: "nurse-priya", role: "nurse", name: "Priya", zh: "护士 Priya", en: "Nurse Priya" },
  { id: "manager-mark", role: "manager", name: "Mark", zh: "经理 Mark", en: "Manager Mark" },
  { id: "family-lee", role: "family", name: "李婆婆的女儿", zh: "家属（李婆婆的女儿）", en: "Family (Mrs Lee's daughter)", resident: "李婆婆" },
];

// Per tab, so two tabs can be two different people.
const idStore = makeStore("sc_identity", (raw) => IDENTITIES.find((i) => i.id === raw) || IDENTITIES[0], true);
export const useIdentity = () => useSyncExternalStore(idStore.subscribe, idStore.get, idStore.get);
export const setIdentity = (id: string) => idStore.set(id);

// ---------- calls for help ----------
export type Reply = { by: string; at: string; kind: "coming" | "done" };
export type Call = {
  id: string; at: string; ts: number; from: string; to: string[]; resident?: string;
  text: string; urgent?: boolean; replies: Reply[]; seen: string[]; closed?: boolean;
};

// Who can be called. Role keys reach everyone with that role; names reach one person.
export const TARGETS = [
  { key: "nurse", zh: "护士", en: "Nurse" },
  { key: "manager", zh: "经理", en: "Manager" },
  { key: "Jane", zh: "护工 Jane", en: "Carer Jane" },
  { key: "Anna", zh: "护工 Anna", en: "Carer Anna" },
];
export const targetLabel = (key: string, en: boolean) => {
  const x = TARGETS.find((t) => t.key === key);
  return x ? (en ? x.en : x.zh) : key;
};

// Fictional residents used across the web demo.
export const RESIDENTS = [
  { name: "王奶奶", room: 3 }, { name: "陳伯", room: 5 }, { name: "陳婆婆", room: 8 }, { name: "李婆婆", room: 12 },
];
export const residentLabel = (name?: string) => {
  const r = RESIDENTS.find((x) => x.name === name);
  return r ? `${r.room} 号房 ${r.name}` : name || "";
};

const callStore = makeStore<Call[]>("sc_calls", (raw) => { try { return JSON.parse(raw || "[]"); } catch { return []; } });
export const useCalls = () => useSyncExternalStore(callStore.subscribe, callStore.get, callStore.get);
const writeCalls = (list: Call[]) => callStore.set(JSON.stringify(list.slice(-40)));
const hhmm = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

export const isForMe = (c: Call, me: Identity) => c.from !== me.name && (c.to.includes(me.role) || c.to.includes(me.name));
export const myReply = (c: Call, me: Identity) => [...c.replies].reverse().find((r) => r.by === me.name);

export function sendCall(me: Identity, to: string[], text: string, resident?: string, urgent?: boolean) {
  const ts = Date.now();
  const call: Call = { id: `H${String(ts).slice(-6)}`, at: hhmm(), ts, from: me.name, to, resident, text, urgent, replies: [], seen: [] };
  writeCalls([...callStore.get(), call]);
  addShift({ id: call.id, kind: "alert", resident, urgent, text: `${me.name} 叫 ${to.join("、")}：${text}`, status: "等回复 Waiting for reply" });
  return call;
}

export function replyCall(id: string, me: Identity, kind: Reply["kind"]) {
  const at = hhmm();
  writeCalls(callStore.get().map((c) => c.id === id
    ? { ...c, replies: [...c.replies, { by: me.name, at, kind }], closed: c.closed || kind === "done" }
    : c));
  updateShift(id, { status: kind === "done" ? `${me.name} ${at} 已处理 handled` : `${me.name} ${at} 马上到 on the way` });
}

export const markSeen = (id: string, key: string) =>
  writeCalls(callStore.get().map((c) => (c.id === id ? { ...c, seen: [...c.seen, key] } : c)));

export const closeCall = (id: string) =>
  writeCalls(callStore.get().map((c) => (c.id === id ? { ...c, closed: true } : c)));

// Short beep for a new call. Browsers may block sound until the page has been clicked once.
export function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = 880; g.gain.value = 0.08;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.25);
    if ((navigator as any).userActivation?.hasBeenActive) navigator.vibrate?.(200);
  } catch { /* no audio */ }
}

// Same audit log the /agent page writes to.
export function logAudit(action: string, detail: string) {
  try {
    const key = "sunrise_agent_audit";
    const list = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([{ at: new Date().toLocaleString(), action, detail }, ...list].slice(0, 50)));
  } catch { /* storage off */ }
}
