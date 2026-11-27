import React, { useState, useEffect } from 'react';
import { Heart, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Resident } from '../types';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface FamilyDashboardProps {
  resident?: Resident;
}

export function FamilyDashboard({ resident }: FamilyDashboardProps) {
  const app = useLanguage();
  const [lang, setLang] = useState<'en' | 'zh'>(app.lang === 'zh' ? 'zh' : 'en');
  const [appreciationSent, setAppreciationSent] = useState(false);
  const [dynamicUpdate, setDynamicUpdate] = useState<{text: string, time: string} | null>(null);
  const [recentIncident, setRecentIncident] = useState<any | null>(null);

  useEffect(() => {
    if (resident?.id) {
      const stored = localStorage.getItem('latest_family_update_' + resident.id);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const timeString = new Date(parsed.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          setDynamicUpdate({ text: parsed.text, time: `Today, ${timeString}` });
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (db) {
      const q = query(collection(db, "sirsEvents"), orderBy("timestamp", "desc"), limit(1));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const latest = snapshot.docs[0].data();
          // Show alert if recent (e.g. within 24h)
          if (latest.timestamp) {
            const timeDiff = Date.now() - latest.timestamp.toMillis();
            if (timeDiff < 24 * 60 * 60 * 1000) {
              setRecentIncident(latest);
            }
          }
        }
      });
      return () => unsubscribe();
    }
  }, [resident?.id]);

  const t = {
    en: {
      welcome: "Welcome to Sunrise Family Portal",
      linking: "Linking your account to your loved one...",
      doingWell: "Doing Well Today",
      summary: `${resident?.name} has had a peaceful day today. Meals were enjoyed and they participated in the morning garden walk.`,
      room: "Room",
      careTime: "Care Time Today",
      routine: "Today's Routine",
      recentUpdates: "From the care team",
      todayUpdate: `"Hello family, we wanted to share a quick update. ${resident?.name} is doing very well today. They enjoyed lunch and spent some time chatting with friends in the sunroom. Mood is positive and relaxed!"`,
      yesterdayUpdate: `"A calm evening. ${resident?.name} participated in the mild stretching class and had a good appetite for dinner."`,
      sentBy: "Sent by Care Team",
      messageTeam: "Message Care Team",
      sendAppreciation: "Send a thank-you",
      appreciationSent: "Thank-you sent to the care team",
      schedule: [
        { time: '08:00 AM', activity: 'Breakfast & Morning Medication' },
        { time: '10:30 AM', activity: 'Morning Walk in Garden' },
        { time: '12:30 PM', activity: 'Lunch' },
        { time: '03:00 PM', activity: 'Afternoon Tea & Social Hour' },
        { time: '06:00 PM', activity: 'Dinner' },
        { time: '08:00 PM', activity: 'Evening Routine' },
      ],
      statusCompleted: "Completed",
      statusInProgress: "In progress..."
    },
    zh: {
      welcome: "欢迎使用 Sunrise 家属平台",
      linking: "正在链接您家人的档案...",
      doingWell: "今天状态很好",
      summary: `${resident?.name} 今天度过了平静的一天。进食状况良好，并参加了早晨的花园散步。`,
      room: "房间号",
      careTime: "今日护理时长",
      routine: "今天的安排",
      recentUpdates: "护理团队的消息",
      todayUpdate: `"家属您好，向您同步一下最新情况。${resident?.name} 今天状态非常好。午餐胃口不错，还在阳光房和朋友们聊了一会儿天。目前情绪积极且放松！"`,
      yesterdayUpdate: `"昨晚情况平稳。${resident?.name} 参加了舒缓拉伸课程，晚餐胃口很好。"`,
      sentBy: "护理团队发送",
      messageTeam: "联系护理团队",
      sendAppreciation: "给护理团队说声谢谢",
      appreciationSent: "谢谢已经传给护理团队",
      schedule: [
        { time: '上午 08:00', activity: '早餐与晨间服药' },
        { time: '上午 10:30', activity: '花园晨间散步' },
        { time: '中午 12:30', activity: '午餐' },
        { time: '下午 03:00', activity: '下午茶与社交时间' },
        { time: '傍晚 06:00', activity: '晚餐' },
        { time: '晚上 08:00', activity: '晚间洗漱与休息' },
      ],
      statusCompleted: "已完成",
      statusInProgress: "进行中..."
    }
  };

  if (!resident) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Heart className="w-10 h-10 text-amber-500 mb-4" />
        <h2 className="text-[26px] font-semibold text-slate-900">{t[lang].welcome}</h2>
        <p className="text-slate-500 mt-2">{t[lang].linking}</p>
      </div>
    );
  }

  // Mock schedule icons and status
  const scheduleData = [
    { ...t[lang].schedule[0], status: 'completed' },
    { ...t[lang].schedule[1], status: 'completed' },
    { ...t[lang].schedule[2], status: 'completed' },
    { ...t[lang].schedule[3], status: 'current' },
    { ...t[lang].schedule[4], status: 'upcoming' },
    { ...t[lang].schedule[5], status: 'upcoming' },
  ];
  const initials = (resident.name || '').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2);

  const handleSendAppreciation = () => {
    setAppreciationSent(true);
    // In a real app, this would fire an event to the backend that the caregiver dashboard listens to
    // For local testing purposes, we'll store it in localStorage so the other dashboard can pick it up
    localStorage.setItem('family_appreciation', JSON.stringify({
      residentName: resident.name,
      timestamp: Date.now()
    }));
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-8">
      <div className="flex justify-end gap-4 mb-6 text-[14px]">
        {(['en', 'zh'] as const).map((l) => (
          <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
            className={`py-1 border-b-2 ${lang === l ? 'border-amber-400 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
            {l === 'en' ? 'English' : '中文'}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-6 sm:items-center mb-8">
        <div className="w-24 h-24 shrink-0 rounded-full bg-indigo-50 text-slate-900 flex items-center justify-center text-3xl font-heading font-semibold" aria-hidden="true">{initials}</div>
        <div className="flex-1 min-w-0">
          {recentIncident ? (
            <span className="inline-flex items-center gap-2 text-[14px] text-amber-700"><span className="w-2 h-2 rounded-full bg-amber-400" />{lang === 'zh' ? '最近有事故报告' : 'Recent incident reported'}</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-[14px] text-emerald-700"><span className="w-2 h-2 rounded-full bg-emerald-500" />{t[lang].doingWell}</span>
          )}
          <h1 className="mt-1 text-[40px] leading-[48px] font-semibold text-slate-900">{resident.name}</h1>
          <p className="m-0 mt-2 text-[17px] leading-7 text-slate-600 max-w-xl">
            {recentIncident ? <span className="text-amber-800">{recentIncident.description || recentIncident.message}</span> : t[lang].summary}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 border-y border-slate-200 mb-12">
        <div className="py-5 pr-6">
          <span className="text-[13px] text-slate-500">{t[lang].room}</span>
          <div className="mt-1 text-[22px] text-slate-900">{resident.room}</div>
        </div>
        <div className="py-5 pl-6 border-l border-slate-200">
          <span className="text-[13px] text-slate-500">{t[lang].careTime}</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[40px] leading-none font-light tracking-[-0.03em] text-slate-900 tabular-nums">{resident.careMinutesToday}</span>
            <span className="text-[15px] text-slate-500">{lang === 'zh' ? '分钟' : 'min'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12">
        {/* Today's routine */}
        <div>
          <h2 className="text-[26px] font-semibold text-slate-900 mb-4">{t[lang].routine}</h2>
          <ol className="m-0 p-0 pt-4 list-none border-t border-slate-200">
            {scheduleData.map((item, i) => {
              const done = item.status === 'completed';
              const now = item.status === 'current';
              return (
                <li key={i} className="flex gap-4">
                  <span className={`w-20 shrink-0 text-[13px] tabular-nums pt-px ${item.status === 'upcoming' ? 'text-slate-400' : 'text-slate-500'}`}>{item.time}</span>
                  <span className="flex flex-col items-center w-2.5 shrink-0" aria-hidden="true">
                    <span className={`mt-1.5 w-2.5 h-2.5 rounded-full ${done ? 'bg-slate-900' : now ? 'bg-amber-400 ring-4 ring-amber-100' : 'border border-slate-300 bg-slate-50'}`} />
                    {i < scheduleData.length - 1 && <span className="flex-1 w-px bg-slate-200 mt-1" />}
                  </span>
                  <span className="flex-1 pb-6">
                    <span className={`block text-[16px] ${item.status === 'upcoming' ? 'text-slate-400' : 'text-slate-900'} ${now ? 'font-semibold' : ''}`}>{item.activity}</span>
                    {done && <span className="text-[13px] text-emerald-700">{t[lang].statusCompleted}</span>}
                    {now && <span className="text-[13px] text-amber-700">{t[lang].statusInProgress}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Updates from the team */}
        <div className="flex flex-col">
          <h2 className="text-[26px] font-semibold text-slate-900 mb-4">{t[lang].recentUpdates}</h2>
          <div className="rounded-[24px] bg-indigo-50 p-6">
            <span className="text-[13px] text-amber-800">{dynamicUpdate ? dynamicUpdate.time : (lang === 'zh' ? '今天 14:30' : 'Today, 2:30 PM')}</span>
            <p className="m-0 mt-2 text-[16px] leading-7 text-slate-900 whitespace-pre-wrap">{dynamicUpdate ? dynamicUpdate.text : t[lang].todayUpdate}</p>
            <span className="mt-4 block text-[13px] text-slate-600">{t[lang].sentBy}{lang === 'zh' ? '（AI 协助撰写，护理团队确认）' : ' (drafted with AI, checked by the team)'}</span>
          </div>
          <div className="mt-6 py-4 border-y border-slate-200">
            <span className="text-[13px] text-slate-500">{lang === 'zh' ? '昨天 17:45' : 'Yesterday, 5:45 PM'}</span>
            <p className="m-0 mt-1 text-[15px] leading-7 text-slate-700">{t[lang].yesterdayUpdate}</p>
          </div>
          <div className="mt-6 flex flex-col gap-3">
            {appreciationSent ? (
              <span className="inline-flex items-center gap-2 min-h-12 text-[15px] text-emerald-700"><CheckCircle2 className="w-4 h-4" /> {t[lang].appreciationSent}</span>
            ) : (
              <button onClick={handleSendAppreciation} className="min-h-12 px-7 rounded-full bg-slate-900 text-white text-[16px] font-semibold hover:bg-slate-700 transition-colors">
                {t[lang].sendAppreciation}
              </button>
            )}
            <button className="min-h-12 px-6 rounded-full border border-slate-300 bg-white text-slate-900 text-[16px] hover:border-slate-500 transition-colors">
              {t[lang].messageTeam}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
