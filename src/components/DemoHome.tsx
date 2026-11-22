// Public demo home — added for the Cyberport AI Agent Challenge (Nov 2026).
// One place to start: three steps a visitor can try without an account.
import React from "react";
import { Sun, Bot, Heart, ClipboardCheck, ShieldCheck, ArrowRight } from "lucide-react";

const STEPS = [
  { n: 1, href: "/agent", icon: Bot, title: "护理记录 Care notes", zh: "护工用母语说一句，智能体写英文记录、逐句核对、判断严重事故，最后交护士确认。",
    en: "A carer speaks in their own language. The agent drafts the note, checks it, assesses incidents, and stops for a nurse.", try: "试试：点示例“普通话：跌倒撞头”，再点“运行智能体”。" },
  { n: 2, href: "/companion", icon: Heart, title: "陪伴聊天 Companion", zh: "AI 陪院友聊天，整理成护工看得懂的聊天卡；说到胸口痛等危险的话，马上通知护士。",
    en: "The AI keeps a resident company, builds a chat card for carers, and alerts the nurse on red flags.", try: "试试：勾选同意 → 开始 → 点下面的示例句子 → 点“生成”。" },
  { n: 3, href: "/handover", icon: ClipboardCheck, title: "交班单 Handover", zh: "班尾一键把这个班的记录、提醒、聊天卡整理成一页交班单，每一行都能点回来源。",
    en: "One tap turns the shift's notes, alerts and chat cards into a handover sheet with sources.", try: "试试：点“载入示范班次”，再点“生成交班单”。" },
];

export function DemoHome() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center gap-3">
          <Sun className="w-10 h-10 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Sunrise Care 晨曦關懷</h1>
            <p className="text-slate-500">把时间还给照顾和陪伴的养老院智能体 · An AI agent that gives care time back to carers and residents</p>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="rounded-xl border bg-white p-4 flex items-start gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-700">
            <div className="font-semibold">不用登录，三步就能试完。No account needed.</div>
            <div>示范只使用虚构数据，请不要输入真实院友资料。AI 只做辅助，重要的事一定交给护士。</div>
            <div className="text-slate-500">Demo uses fictional data only. Please do not enter real resident information. The AI assists; a nurse decides.</div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <a key={s.n} href={s.href} className="group rounded-xl border bg-white p-5 hover:border-orange-400 hover:shadow transition flex flex-col">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center">{s.n}</span>
                <s.icon className="w-6 h-6 text-orange-500" />
                <span className="font-semibold text-lg">{s.title}</span>
              </div>
              <p className="mt-3 text-sm text-slate-700">{s.zh}</p>
              <p className="mt-1 text-xs text-slate-500">{s.en}</p>
              <p className="mt-3 text-sm bg-orange-50 text-orange-800 rounded-lg p-2">{s.try}</p>
              <span className="mt-4 text-orange-600 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">打开 Open <ArrowRight className="w-4 h-4" /></span>
            </a>
          ))}
        </div>
        <div className="text-sm text-slate-500 space-y-1">
          <div>第一次打开时如果等了几十秒，是免费服务器在启动，之后就快了。If the first run takes a while, the free server is waking up.</div>
          <div>代码和测试结果 Code and evaluation: <a className="text-orange-600 hover:underline" href="https://github.com/hyy7010-ai/agecare-1" target="_blank" rel="noreferrer">github.com/hyy7010-ai/agecare-1</a></div>
          <div>原有的院舍管理 App（需要登录）The original facility app (login required): <a className="text-orange-600 hover:underline" href="/login">/login</a></div>
        </div>
      </main>
    </div>
  );
}
