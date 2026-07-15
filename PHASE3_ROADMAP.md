# Phase 3 Roadmap & RBAC Spec (Future)

## 📌 核心原则 (7月15日 MVP Deadline 之后才会动)
当前产品已具备完整 11 项核心功能与 AI闭环。为了保证核心演示视频的聚焦，此文档内的需求被冻结。

---

## 4 角色权限矩阵清单

### 👤 Caregiver (护工) — 前线执行者
**核心理念**: 傻瓜化，3次点击内完成核心任务。只关心“我今天要做什么、做完了、有没有异常”。
- [x] 我的今日班次 / 获取负责的住户列表 (已初步基于ID过滤)
- [x] 今日护理任务清单 (已在 Dashboard 基本呈现)
- [x] 快速观察上报 — 人体图+拍照+AI识别+提交给RN
- [x] 语音Daily Note — 通过AI生成正式记录
- [ ] *[Phase 3] 我提交的观察状态 — 跟踪 RN 是否已确认*
- ❌ **Forbidden**: Roster Guard、SIRS批准与上报、全部住户记录、机构合规报表

### 👩‍⚕️ RN (注册护士) — 医疗判断者
**核心理念**: 医疗安全的守门员。AI给建议，RN做决定。
- [x] RN Review队列 — 所有待审核的AI观察
- [x] Confirm / Override / Add Note — 对AI结果做判断归档
- [x] SIRS事件审核 — Caregiver上报直接事件的评估
- [ ] *[Phase 3] 住户医疗概况 — 详细医疗历史、用药、过敏全貌（当前为基础Profile）*
- [ ] *[Phase 3] 24/7 RN在岗状态切换与预警*
- ❌ **Forbidden**: Roster Guard、全系统Admin设置

### 👔 Manager (经理) — 运营与合规
**核心理念**: 仪表板驱动，做决策、签合规文件。
- [x] 合规仪表板 — 全院Care Minutes、RN在岗、实时SIRS监控
- [x] Roster Guard 排班 — AI智能校验合规拖拽排班
- [x] SIRS 紧急审批 — Manager 点击确认拦截并清除全屏高危Alert
- [x] 员工管理模块 (Staff Management)
- [x] 合规报表一键导出 (PDF) — (UI与导出模拟完成)
- ❌ **Forbidden**: 直接撰写住户初级医疗记录、直接代替RN确认AI临床观察

### 👪 Family Portal (Ecosystem Extension)
**核心理念**: 自动过滤隐私，向家属推送每日“安心快报”，释放前台行政压力。
- [ ] *[Phase 3] 家属专属每日微信/短信推送 (基于 AI 的脱敏总结)*
### 🛡️ Admin (系统管理员) — 技术维护
**核心理念**: 平台级底层维护，不参与日常机构护理。
- [ ] *[Phase 3] 机构管理结构 (如添加分院)*
- [ ] *[Phase 3] 系统用户邀请与权限修改*
- [ ] *[Phase 3] 系统安全与审计日志*
- [ ] *[Phase 3] 全局数据备份与导出*
- ❌ **Forbidden**: 查看涉及住户隐私的具体病历细节、确认临床AI观察
