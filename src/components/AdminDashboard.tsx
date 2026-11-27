import React, { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'audit'>('analytics');
  const { lang } = useLanguage();
  const zh = lang === 'zh';
  const T = (a: string, b: string) => (zh ? a : b);
  
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [dbAuditLogs, setDbAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!db) return;
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbUsers(usersData);
      } catch (e) {
        console.warn("Failed to fetch users", e);
      }
    };
    const fetchAuditLogs = async () => {
      try {
        if (!db) return;
        const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(20));
        const logsSnapshot = await getDocs(q);
        const logsData = logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDbAuditLogs(logsData);
      } catch (e) {
        console.warn("Failed to fetch audit logs", e);
      }
    };
    fetchUsers();
    fetchAuditLogs();
  }, []);

  const mockUsers = [
    { id: 1, name: 'Sarah Jenkins', role: 'Caregiver', status: 'Active', lastLogin: '2 mins ago' },
    { id: 2, name: 'Emily Chen', role: 'RN', status: 'Active', lastLogin: '1 hour ago' },
    { id: 3, name: 'Michael Thompson', role: 'Manager', status: 'Active', lastLogin: '3 hours ago' },
    { id: 4, name: 'Sarah Connor', role: 'Caregiver', status: 'Offline', lastLogin: 'Yesterday' },
  ];

  const mockAuditLogs = [
    { id: 101, user: 'Emily Chen', action: 'Confirmed Observation', target: 'Eleanor Vance', time: '10 mins ago', type: 'clinical' },
    { id: 102, user: 'Sarah Jenkins', action: 'Submitted Care Note', target: 'James O\'Connor', time: '25 mins ago', type: 'clinical' },
    { id: 103, user: 'Michael Thompson', action: 'Modified Shift Roster', target: 'System', time: '1 hour ago', type: 'system' },
    { id: 104, user: 'System Admin', action: 'Invited User (Sarah Connor)', target: 'System', time: '2 days ago', type: 'admin' },
  ];

  const careMinutesData = [
    { name: 'Mon', required: 200, actual: 210 },
    { name: 'Tue', required: 200, actual: 195 },
    { name: 'Wed', required: 200, actual: 205 },
    { name: 'Thu', required: 200, actual: 220 },
    { name: 'Fri', required: 200, actual: 215 },
    { name: 'Sat', required: 200, actual: 190 },
    { name: 'Sun', required: 200, actual: 198 },
  ];

  const riskHeatmapData = [
    { zone: 'Bathroom (Wing A)', incidents: 12, risk: 'High' },
    { zone: 'Dining Hall', incidents: 4, risk: 'Low' },
    { zone: 'Garden Pathway', incidents: 8, risk: 'Medium' },
    { zone: 'Bathroom (Wing B)', incidents: 9, risk: 'Medium' },
    { zone: 'Lounge Area', incidents: 2, risk: 'Low' },
    { zone: 'Corridor C', incidents: 5, risk: 'Medium' },
  ];

  const tabCls = (on: boolean) => `shrink-0 py-3 text-[15px] border-b-2 -mb-px transition-colors ${on ? 'border-amber-400 text-slate-900 font-semibold' : 'border-transparent text-slate-500 hover:text-slate-900'}`;
  const tip = { borderRadius: 12, border: '1px solid #E7DFD1', boxShadow: 'none', background: '#FAF6EE' };
  const kpis = [
    { label: T('可能漏报的严重事故', 'Missed reporting risks'), value: '3', note: T('本周 +1 · 可能没登记的 SIRS 事件', '+1 this week · possible unlogged SIRS events'), tone: 'text-red-600' },
    { label: T('护理时长达标率', 'Care minutes compliance'), value: '96.8%', note: T('达标 · 每位长者要求 200 分钟', 'Target met · 200 min per resident'), tone: 'text-emerald-700' },
    { label: T('今年已报 SIRS', 'SIRS submitted (YTD)'), value: '12', note: T('全部已成功提交', 'All submitted'), tone: 'text-slate-500' },
  ];

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-[40px] leading-[48px] font-semibold text-slate-900">{T('管理总览', 'Executive overview')}</h1>
          <p className="text-base text-slate-500 mt-2">{T('院舍数据、合规指标和风险分析。', 'Facility insights, compliance metrics and risk analysis.')}</p>
        </div>
        <span className="text-[13px] text-slate-500">{T('刚刚更新', 'Updated just now')}</span>
      </div>

      <div role="tablist" className="flex gap-6 border-b border-slate-200 mb-10 overflow-x-auto">
        <button role="tab" aria-selected={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} className={tabCls(activeTab === 'analytics')}>{T('数据分析', 'Analytics')}</button>
        <button role="tab" aria-selected={activeTab === 'users'} onClick={() => setActiveTab('users')} className={tabCls(activeTab === 'users')}>{T('用户管理', 'Users')}</button>
        <button role="tab" aria-selected={activeTab === 'audit'} onClick={() => setActiveTab('audit')} className={tabCls(activeTab === 'audit')}>{T('审计日志', 'Audit log')}</button>
      </div>

      {activeTab === 'analytics' ? (
        <div className="flex flex-col gap-12">
          <div>
            <div className="grid grid-cols-1 md:grid-cols-3 border-y border-slate-200">
              {kpis.map((k, i) => (
                <div key={k.label} className={`py-6 ${i > 0 ? 'md:pl-8 md:border-l border-t md:border-t-0 border-slate-200' : ''} ${i < 2 ? 'md:pr-8' : ''}`}>
                  <span className="text-[13px] text-slate-500">{k.label}</span>
                  <div className="mt-2 text-[56px] leading-none font-light tracking-[-0.04em] text-slate-900 tabular-nums">{k.value}</div>
                  <span className={`mt-3 block text-[13px] ${k.tone}`}>{k.note}</span>
                </div>
              ))}
            </div>
            <span className="mt-2 block text-[12px] text-slate-400">{T('示范数据', 'Demo data')}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-[26px] font-semibold text-slate-900">{T('护理时长趋势', 'Care minutes trend')}</h2>
              <p className="text-[14px] text-slate-500 mt-1 mb-4">{T('实际（实线）和要求的 200 分钟（虚线）', 'Actual (solid) against the required 200 min (dashed)')}</p>
              <div className="h-64 border-t border-slate-200 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={careMinutesData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F5B700" stopOpacity={0.35}/>
                        <stop offset="95%" stopColor="#F5B700" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E7DFD1" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#7D7264', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#7D7264', fontSize: 12 }} domain={[160, 240]} />
                    <Tooltip contentStyle={tip} />
                    <Area isAnimationActive={false} type="monotone" dataKey="actual" name={T('实际分钟', 'Actual')} stroke="#1F1B16" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" />
                    <Area isAnimationActive={false} type="monotone" dataKey="required" name={T('要求 200', 'Required 200')} stroke="#5F8746" strokeWidth={1.5} strokeDasharray="5 5" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <h2 className="text-[26px] font-semibold text-slate-900">{T('高风险区域', 'High-risk areas')}</h2>
              <p className="text-[14px] text-slate-500 mt-1 mb-4">{T('按事故次数，红色是高风险', 'By incidents recorded; red is high risk')}</p>
              <div className="h-64 border-t border-slate-200 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskHeatmapData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="#E7DFD1" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#7D7264', fontSize: 12 }} />
                    <YAxis dataKey="zone" type="category" width={170} axisLine={false} tickLine={false} tick={{ fill: '#5E5549', fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#F3EDE2' }} contentStyle={tip} />
                    <Bar isAnimationActive={false} dataKey="incidents" name={T('事故次数', 'Incidents')} radius={[0, 6, 6, 0]} barSize={14}>
                      {riskHeatmapData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.risk === 'High' ? '#D4382C' : entry.risk === 'Medium' ? '#F5B700' : '#A2BF8B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div>
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-[26px] font-semibold text-slate-900">{T('系统用户', 'System users')}</h2>
            <button className="inline-flex items-center gap-2 min-h-11 px-5 rounded-full bg-slate-900 text-white text-[15px] font-semibold hover:bg-slate-700 transition-colors">
              <UserPlus className="w-4 h-4" /> {T('邀请用户', 'Invite user')}
            </button>
          </div>
          {dbUsers.length === 0 ? (
            <p className="m-0 py-6 border-y border-slate-200 text-[15px] text-slate-500">{T('没有找到用户。', 'No users found.')}</p>
          ) : (
            <ul className="m-0 p-0 list-none border-b border-slate-200">
              {dbUsers.map((u) => (
                <li key={u.id} className="py-4 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-1">
                  <span className="flex-1 min-w-[200px] text-[16px] font-semibold text-slate-900">{u.name || u.displayName || u.email || 'Unknown User'}</span>
                  <span className="w-28 text-[14px] text-slate-600 capitalize">{u.role || 'caregiver'}</span>
                  <span className="w-24 flex items-center gap-2 text-[14px] text-slate-600">
                    <span className={`w-2 h-2 rounded-full ${u.status === 'Active' || !u.status ? 'bg-emerald-500' : 'bg-slate-300'}`} />{u.status || 'Active'}
                  </span>
                  <span className="w-28 text-[13px] text-slate-500">{u.lastLogin || T('最近', 'Recent')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-[26px] font-semibold text-slate-900 mb-4">{T('安全和审计日志', 'Security and audit log')}</h2>
          {dbAuditLogs.length === 0 ? (
            <p className="m-0 py-6 border-y border-slate-200 text-[15px] text-slate-500">{T('没有审计记录。', 'No audit logs found.')}</p>
          ) : (
            <ul className="m-0 p-0 list-none border-b border-slate-200">
              {dbAuditLogs.map((log) => {
                const dateObj = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp || Date.now());
                return (
                  <li key={log.id} className="py-4 border-t border-slate-200 flex flex-col sm:flex-row gap-x-6 gap-y-1">
                    <span className="sm:w-44 shrink-0 text-[13px] text-slate-500 tabular-nums">{dateObj.toLocaleString()}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[15px] text-slate-900">{log.action}</span>
                      <span className="block text-[13px] text-slate-500">{log.userEmail || log.userId || 'System'}{(log.details || log.resourceId) ? ` · ${log.details || log.resourceId}` : ''}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
