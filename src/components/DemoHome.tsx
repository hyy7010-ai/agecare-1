// Public demo home — added for the Cyberport AI Agent Challenge (Nov 2026).
// One place to start: three steps a visitor can try without an account.
import React from "react";
import { ScPage, useEn } from "./ScShell";

const STEPS = [
  { href: "/agent", zh: "护理记录", en: "Care notes",
    dZh: "说一句母语，出一份英文记录，每句都对得上原话，最后交护士确认。",
    dEn: "Say it in your own language. The agent drafts an English note, checks every sentence, and stops for a nurse.",
    tZh: "试试：点示例「跌倒撞头」，再点「生成记录」。", tEn: "Try: pick the “fall” example, then Generate note." },
  { href: "/companion", zh: "陪伴聊天", en: "Companion",
    dZh: "陪老人聊天，整理成护工看得懂的聊天卡；听到危险的话马上叫护士。",
    dEn: "Keeps a resident company, builds a chat card for carers, and alerts the nurse on red flags.",
    tZh: "试试：勾选同意，开始，点示例句子，再点「生成」。", tEn: "Try: give consent, start, tap a sample sentence, then Generate." },
  { href: "/handover", zh: "交班单", en: "Handover",
    dZh: "一个班的事整理成一页，每行都能点回原始记录。",
    dEn: "One shift on one page. Every line links back to where it came from.",
    tZh: "试试：点「载入示范班次」，再点「生成交班单」。", tEn: "Try: Load demo shift, then Generate." },
];

export function DemoHome() {
  const { en, t } = useEn();
  return (
    <ScPage>
      <main className="max-w-[1120px] mx-auto px-4 sm:px-8 pt-12 sm:pt-[72px] pb-20 flex flex-col">
        <h1 className="m-0 font-semibold tracking-[-0.03em] leading-[1.08] max-w-[820px]" style={{ fontSize: "clamp(40px, 6vw, 72px)" }}>
          {en ? <>Carers speak their language.<br />A nurse signs it off.</> : <>护工说母语，<br />护士确认才生效。</>}
        </h1>
        <p className="mt-6 text-lg leading-[30px] text-sc-ink-2 max-w-[560px]">
          {t("护工用自己的语言说发生了什么，智能体写成英文护理记录，逐句对照原话，交给护士决定。",
            "A carer says what happened in their own language. The agent writes the English care note, checks it sentence by sentence, and hands it to a nurse.")}
        </p>

        <div className="mt-14 sm:mt-[72px] flex flex-col">
          {STEPS.map((s, i) => (
            <a key={s.href} href={s.href}
              className={`group flex flex-wrap items-baseline gap-x-6 gap-y-2 py-7 border-t border-sc-line text-sc-ink ${i === STEPS.length - 1 ? "border-b" : ""}`}>
              <span className="basis-[200px] shrink-0 text-[22px] font-semibold">{en ? s.en : s.zh}</span>
              <span className="flex-1 basis-[320px] flex flex-col gap-1">
                <span className="text-base leading-[26px] text-sc-ink-2">{en ? s.dEn : s.dZh}</span>
                <span className="text-sm text-sc-muted">{en ? s.tEn : s.tZh}</span>
              </span>
              <span className="text-xl transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
            </a>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-4 text-sm leading-[22px] text-sc-muted">
          <span className="flex-1 basis-[260px] max-w-[340px]">{t("智能体不能自己定稿，也不能自己上报，每次都停下来等护士。", "The agent can't finalise or report on its own. It always stops for a nurse.")}</span>
          <span className="flex-1 basis-[260px] max-w-[340px]">{t("只用虚构数据，请不要输入真实院友资料。电话和证件号在送给 AI 之前会被遮掉。", "Fictional data only; please don't enter real resident details. Phone and ID numbers are masked before the AI sees them.")}</span>
          <span className="flex-1 basis-[260px] max-w-[340px]">{t("不用登录。第一次打开要等几十秒，免费服务器在启动。", "No account needed. The first run can take a while because the free server is waking up.")}</span>
        </div>
      </main>

      <footer className="max-w-[1120px] mx-auto px-4 sm:px-8 pt-6 pb-10 flex flex-wrap gap-7 text-sm">
        <a href="https://github.com/hyy7010-ai/agecare-1" target="_blank" rel="noreferrer" className="text-sc-ink-2 underline hover:text-sc-ink">{t("代码和测试结果", "Code and evaluation")}</a>
        <a href="/login" className="text-sc-ink-2 underline hover:text-sc-ink">{t("原来的院舍 App（要登录）", "Original facility app (login required)")}</a>
      </footer>
    </ScPage>
  );
}
