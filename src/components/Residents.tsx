// Resident panel (/residents). One page per resident; what you can see depends on who you are.
// Staff see everything for the shift; family see only their own relative, the care plan basics
// and notes a nurse has confirmed. Fictional residents only.
import React, { useState } from "react";
import { ScPage, Label, useEn } from "./ScShell";
import { useIdentity, useCalls, useMoments, useRemoteEvents, residentOf, RESIDENTS, targetLabel, Role } from "../lib/demoStore";
import { QuickLog, Timeline, Ev } from "./Timeline";
import { readShift } from "../lib/shiftLog";

type P = { zh: string; en: string };
const PROFILE: Record<string, { watch: P[]; likes: P[] }> = {
  "王奶奶": {
    watch: [{ zh: "跌倒风险高，起身要有人扶", en: "High fall risk; needs help to stand" }, { zh: "糖尿病，甜点先问护士", en: "Diabetic; ask the nurse before sweets" }],
    likes: [{ zh: "早上听收音机", en: "Radio in the morning" }, { zh: "喜欢讲她的孙女", en: "Loves talking about her granddaughter" }],
  },
  "陳伯": {
    watch: [{ zh: "膝盖痛，走路慢，别催", en: "Knee pain; walks slowly, don't rush him" }],
    likes: [{ zh: "下象棋", en: "Chinese chess" }, { zh: "看赛马新闻", en: "Horse racing news" }],
  },
  "陳婆婆": {
    watch: [{ zh: "有心脏病史，说胸口不舒服马上叫护士", en: "Heart history; call the nurse at once if she mentions chest discomfort" }],
    likes: [{ zh: "讲以前在茶楼做点心三十年", en: "Thirty years making dim sum at a tea house" }, { zh: "不要提她的丈夫", en: "Avoid talking about her husband" }, { zh: "早上一杯热水，午饭后坐窗边", en: "Hot water in the morning; sits by the window after lunch" }],
  },
  "李婆婆": {
    watch: [{ zh: "最近胃口差", en: "Poor appetite lately" }, { zh: "睡不好，凌晨三四点会醒", en: "Sleeps badly; wakes at 3–4 am" }],
    likes: [{ zh: "女儿打电话来会很开心", en: "Brightens up when her daughter calls" }],
  },
};

// What each role may see. Family: basics and confirmed notes only.
const CAN: Record<string, Role[]> = {
  watch: ["carer", "nurse", "manager", "family"],
  likes: ["carer", "nurse", "manager"],
  confirmed: ["carer", "nurse", "manager", "family"],
  pending: ["carer", "nurse", "manager"],
  alerts: ["carer", "nurse", "manager"],
  moments: ["carer", "nurse", "manager"],
};

const isConfirmed = (status?: string) => /确认|approved/i.test(status || "");

export function Residents() {
  const { en, t } = useEn();
  const me = useIdentity();
  const calls = useCalls();
  const moments = useMoments();
  const remoteEvents = useRemoteEvents();
  const entries = readShift();
  const list = me.role === "family" ? RESIDENTS.filter((r) => r.name === me.resident) : RESIDENTS;
  const fromUrl = new URLSearchParams(window.location.search).get("r") || "";
  const [pick, setPick] = useState(fromUrl);
  const cur = list.find((r) => r.name === pick) || list[0];
  const can = (k: string) => CAN[k].includes(me.role);

  const mine = entries.filter((e) => e.resident === cur.name);
  const notes = mine.filter((e) => e.kind === "note");
  const confirmed = notes.filter((e) => !e.pending && isConfirmed(e.status));
  const pending = notes.filter((e) => e.pending || !isConfirmed(e.status));
  const cards = mine.filter((e) => e.kind === "card");
  const alerts = mine.filter((e) => e.kind === "alert");
  const rCalls = calls.filter((c) => c.resident === cur.name);
  const p = PROFILE[cur.name];
  const tx = (x: P) => (en ? x.en : x.zh);

  // Today's timeline, filtered by what this role may see.
  const events: Ev[] = [];
  for (const e of mine) {
    if (rCalls.some((c) => c.id === e.id)) continue;
    if (e.kind === "note") {
      const ok = !e.pending && isConfirmed(e.status);
      if (!ok && !can("pending")) continue;
      events.push({ at: e.at, kind: ok ? t("护理记录 · 护士已确认", "Care note · confirmed") : t("护理记录 · 还没确认", "Care note · not confirmed"),
        text: e.text, sub: e.status, lang: "en", red: !ok && /红线|必须|must/i.test(e.status || "") });
    } else if (e.kind === "card") {
      if (can("likes")) events.push({ at: e.at, kind: t("聊天卡", "Chat card"), text: e.text });
    } else if (can("alerts")) {
      events.push({ at: e.at, kind: t("提醒", "Alert"), text: e.text, sub: e.status, red: !!e.urgent });
    }
  }
  if (can("alerts")) for (const c of rCalls) {
    events.push({ at: c.at, kind: c.urgent ? t(`紧急呼叫 · ${c.from}`, `Urgent call · ${c.from}`) : t(`呼叫 · ${c.from}`, `Call · ${c.from}`),
      text: `${c.to.map((k) => targetLabel(k, en)).join(en ? ", " : "、")}：${c.text}`, red: !!c.urgent });
    for (const r of c.replies) events.push({ at: r.at, kind: t("回复", "Reply"), text: r.kind === "coming" ? t(`${r.by} 马上到`, `${r.by} is on the way`) : t(`${r.by} 已处理`, `${r.by} handled it`) });
  }
  if (can("moments")) for (const m of moments.filter((x) => x.resident === cur.name)) {
    events.push({ at: m.at, kind: t(`记一笔 · ${m.by}`, `Quick log · ${m.by}`), text: m.text, photo: m.photo });
  }
  // meal photos, notes and quick logs sent from the glasses (calls are already in rCalls)
  for (const e of remoteEvents.filter((x) => ["meal", "note", "moment"].includes(x.type) && residentOf(x) === cur.name)) {
    const kind = e.type === "meal" ? t("餐盘", "Meal") : e.type === "note" ? t("护理记录", "Care note") : t("记一笔", "Quick log");
    const showNote = e.type === "note" ? can("pending") : can("moments");
    if (!showNote) continue;
    const d = e.data || {};
    const sub = e.type === "meal" && (d.percentEaten != null || d.kcalEstimate != null)
      ? t(`吃了约 ${d.percentEaten ?? "?"}% · 约 ${d.kcalEstimate ?? "?"} 大卡`, `About ${d.percentEaten ?? "?"}% eaten · ~${d.kcalEstimate ?? "?"} kcal`) : undefined;
    events.push({ at: e.at, kind: `${kind} · ${e.from} · ${t("来自眼镜", "from glasses")}`, text: e.text, sub, photo: e.photo,
      red: e.type === "meal" && Array.isArray(d.flags) && d.flags.length > 0 });
  }
  events.sort((a, b) => a.at.localeCompare(b.at));

  const Locked = ({ title, who }: { title: string; who: string }) => (
    <div className="mt-10 flex flex-col">
      <Label>{title}</Label>
      <div className="py-4 border-y border-sc-line text-[15px] text-sc-muted flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        {who}
      </div>
    </div>
  );
  const Rows = ({ items }: { items: React.ReactNode[] }) => (
    <div className="flex flex-col border-b border-sc-line">{items.map((x, i) => <div key={i} className="py-3.5 border-t border-sc-line text-[15px] leading-6">{x}</div>)}</div>
  );
  const Empty = ({ children }: { children: React.ReactNode }) => <p className="m-0 py-3.5 border-y border-sc-line text-[15px] text-sc-muted">{children}</p>;

  const scope = {
    carer: t("你是护工：能看到注意事项、喜好、这个班的记录和呼叫。护理记录要护士确认才算数。", "You're a carer: you see the care plan, likes, this shift's notes and calls. Notes count only after a nurse confirms them."),
    nurse: t("你是护士：能看到全部，等批准的记录去护士台批准。", "You're the nurse: you see everything. Approve waiting notes at the nurse station."),
    manager: t("你是经理：能看到全部。", "You're the manager: you see everything."),
    family: t("你是家属：只看得到自己的家人，以及注意事项和护士确认过的记录。老人的私人聊天、还没确认的记录、内部呼叫都看不到。", "You're family: you see only your relative, the care plan basics and notes a nurse has confirmed. Private chats, unconfirmed notes and staff calls stay hidden."),
  }[me.role];

  return (
    <ScPage current="/residents">
      <main className="max-w-[1120px] mx-auto px-4 sm:px-8 pt-8 pb-20 flex flex-col">
        <h1 className="m-0 text-[40px] leading-[48px] font-semibold tracking-[-0.02em]">{me.role === "family" ? t("我的家人", "My family member") : t("老人", "Residents")}</h1>
        <span className="mt-2 text-base text-sc-muted max-w-[720px]">{scope}</span>

        <div className="mt-10 flex flex-wrap gap-16 items-start">
          {list.length > 1 && (
            <nav aria-label={t("老人名单", "Residents")} className="flex-[0_1_240px] min-w-[200px] flex flex-col border-b border-sc-line">
              {list.map((r) => {
                const waiting = entries.filter((e) => e.resident === r.name && e.kind === "note" && e.pending).length;
                const open = calls.filter((c) => c.resident === r.name && !c.closed).length;
                const on = r.name === cur.name;
                return (
                  <button key={r.name} onClick={() => setPick(r.name)} aria-current={on ? "true" : undefined}
                    className={`text-left flex items-center gap-3 py-3.5 px-3 -mx-3 cursor-pointer ${on ? "bg-sc-photo rounded-xl" : "border-t border-sc-line"}`}>
                    <span className="text-[13px] text-sc-muted tabular-nums w-12">{r.room} {t("号房", "")}</span>
                    <span className={`flex-1 text-[16px] ${on ? "font-semibold" : ""}`}>{r.name}</span>
                    {(waiting > 0 || open > 0) && <span className="w-2 h-2 rounded-full bg-sc-red" aria-label={t("有待处理", "Needs attention")} />}
                  </button>
                );
              })}
            </nav>
          )}

          <section className="flex-[1_1_480px] min-w-0 flex flex-col">
            <span className="text-[13px] text-sc-muted">{cur.room} {t("号房", "· Room")}</span>
            <h2 className="m-0 mt-1 text-[32px] leading-[40px] font-semibold tracking-[-0.02em]">{cur.name}</h2>

            <div className="mt-8 flex flex-col">
              <Label>{t("要注意", "Watch for")}</Label>
              <Rows items={p.watch.map(tx)} />
            </div>

            <div className="mt-10 flex flex-col">
              <Label>{t("今天的时间线", "Today's timeline")}</Label>
              {can("moments") && <div className="mb-5"><QuickLog resident={cur.name} /></div>}
              <Timeline events={events} />
              {me.role === "family" && (
                <span className="mt-1 text-[13px] text-sc-muted flex items-center gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  {t("只显示护士确认过的事。照片、聊天和员工呼叫只有员工能看。", "Only nurse-confirmed items are shown. Photos, chats and staff calls are staff only.")}
                </span>
              )}
            </div>

            {can("likes") ? (
              <div className="mt-10 flex flex-col">
                <Label>{t("喜欢什么、怎么聊", "Likes and how to talk with them")}</Label>
                <Rows items={[...p.likes.map(tx), ...cards.map((c) => <span key={c.id} className="text-sc-ink-2">{t("聊天卡：", "Chat card: ")}{c.text}</span>)]} />
              </div>
            ) : <Locked title={t("喜欢什么、怎么聊", "Likes and how to talk with them")} who={t("老人的私人聊天，只有员工能看", "Private chats: staff only")} />}

            <div className="mt-10 flex flex-col">
              <Label>{t("护士确认过的记录", "Notes confirmed by a nurse")}</Label>
              {confirmed.length === 0 ? <Empty>{t("这个班还没有确认过的记录。", "No confirmed notes this shift yet.")}</Empty> :
                <Rows items={confirmed.map((e) => (
                  <span key={e.id} className="flex flex-col gap-0.5">
                    <span className="text-[13px] text-sc-muted tabular-nums">{e.at}　{e.status}</span>
                    <span lang="en">{e.text}</span>
                  </span>
                ))} />}
              {me.role === "family" && <span className="mt-3 text-[13px] leading-5 text-sc-muted">{t("记录是英文原文。有紧急情况，护士会直接打电话给你。", "Notes are shown as written. In an emergency the nurse will phone you directly.")}</span>}
            </div>

            {can("pending") ? (
              <div className="mt-10 flex flex-col">
                <Label>{t("还没确认的记录", "Notes not yet confirmed")}</Label>
                {pending.length === 0 ? <Empty>{t("没有。", "None.")}</Empty> :
                  <Rows items={pending.map((e) => (
                    <span key={e.id} className="flex flex-col gap-0.5">
                      <span className={`text-[13px] tabular-nums ${/红线|必须|must/i.test(e.status || "") ? "text-sc-red-text" : "text-sc-muted"}`}>{e.at}　{e.status}</span>
                      <span lang="en">{e.text}</span>
                      {me.role === "nurse" && e.pending && <a href="/station" className="self-start text-[14px] underline text-sc-ink">{t("去护士台批准", "Approve at nurse station")}</a>}
                    </span>
                  ))} />}
              </div>
            ) : <Locked title={t("还没确认的记录", "Notes not yet confirmed")} who={t("护士确认以后才会给家属看", "Shown to family only after a nurse confirms")} />}


            {me.role !== "family" && entries.length === 0 && (
              <p className="mt-8 text-[13px] text-sc-muted">{t("这个班还没有记录。去「交班单」点「载入示范班次」，这里就会有内容。", "No shift entries yet. Load the demo shift on the Handover page to fill this in.")} <a href="/handover" className="underline">{t("去交班单", "Go to Handover")}</a></p>
            )}
          </section>
        </div>
      </main>
    </ScPage>
  );
}
