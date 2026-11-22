// Shift log shared by the demo pages (/agent, /companion, /handover).
// Stored in this browser only. Demo data is fictional.
export type ShiftEntry = {
  id: string; at: string; kind: "note" | "alert" | "card";
  resident?: string; text: string; urgent?: boolean; pending?: boolean; status?: string;
};
const KEY = "sunrise_shift_log";
export const readShift = (): ShiftEntry[] => {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
};
const write = (list: ShiftEntry[]) => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-60))); } catch { /* storage off */ } };
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const addShift = (e: Omit<ShiftEntry, "at"> & { at?: string }) => {
  const list = readShift().filter((x) => x.id !== e.id);
  write([...list, { at: now(), ...e }]);
};
export const updateShift = (id: string, patch: Partial<ShiftEntry>) => write(readShift().map((x) => (x.id === id ? { ...x, ...patch } : x)));
export const clearShift = () => write([]);
export const setShift = (list: ShiftEntry[]) => write(list);
