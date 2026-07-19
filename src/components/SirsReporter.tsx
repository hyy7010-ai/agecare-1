import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShieldAlert,
  Cpu,
  Send,
  CheckCircle,
  Flame,
  Loader2,
  Mail,
  Mic,
  Camera,
  MicOff,
  Image as ImageIcon,
  X,
  Globe,
  Search,
  Lock,
} from "lucide-react";
import { SIRSReport, SIRSAlertData } from "../types";
import { sendGmailReport } from "../lib/gmail";
import { initAuth } from "../lib/auth";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { addToOfflineQueue } from "../lib/offlineQueue";
import { scrubPII } from "../lib/piiScrubber";
import { submitSirsEvent } from "../lib/localReviewQueue";
import { CountdownTimer } from "./CountdownTimer";

// Page-local translations. This component predates the app's i18n system, so it
// carries its own dictionary rather than adding ~55 keys to LanguageContext.
const SIRS_I18N: Record<string, Record<string, string>> = {
  en: {
    cancelBack: "Cancel & Back",
    title: "SIRS Incident Reporter",
    subtitle: "AI-assisted reporting for the Serious Incident Response Scheme",
    analyzing: "Gemini is checking compliance criteria and drafting a report.",
    savedOffline: "Saved Offline",
    savedOfflineDesc: "The report has been saved locally and will be analyzed when your connection is restored.",
    returnDashboard: "Return to Dashboard",
    recordVoice: "Record Voice Note",
    startRecording: "Start Recording",
    stopRecording: "Stop Recording",
    audioAttached: "Audio Attached",
    attachPhoto: "Attach Photo",
    takePhoto: "Take / Select Photo",
    narrative: "Narrative Description (Optional if using Voice/Photo)",
    simulateTagalog: "Simulate Tagalog Text",
    narrativePlaceholder: "E.g., Mr. Chen slipped in the bathroom and his arm has a graze... (Or just record voice instead)",
    errorLabel: "Error:",
    analyzeCompliance: "Analyze Compliance",
    preparingPack: "Preparing SIRS Submission Pack...",
    preparingPackDesc: "Compiling the draft and sending an internal notification to the Manager/RN via Gmail API.",
    packPrepared: "SIRS Submission Pack Prepared",
    packPreparedDesc1: "A draft has been prepared for authorised submission through the My Aged Care Service and Support Portal within the mandatory",
    windowP1: "24-hour",
    windowP2: "30-day",
    packPreparedDesc2: "window.",
    internalNotice: "Internal notification sent to the Manager/RN via Gmail API. The official SIRS notice must be submitted by an authorised person through the My Aged Care Service and Support Portal.",
    ccText: "the resident's GP and family contact",
    whatHappened: "What Happened",
    immediateSafety: "Immediate Safety Actions",
    regulatorNotification: "Regulator Notification",
    reportRequiredA: "SIRS Priority",
    reportRequiredB: "Report Required",
    matchedCategory: "Matched Category:",
    aiConfidence: "AI Confidence:",
    aiUncertainty: "AI Uncertainty:",
    verifiedSearch: "Verified via live Google Search",
    searchDesc: "The AI ran these searches against current ACQSC guidelines before classifying:",
    sourcesReferenced: "Sources Referenced",
    officialReference: "Official reference: ACQSC Serious Incident Response Scheme",
    rnOverride: "RN Override Priority",
    rnOverrideDesc: "Manual override of AI classification",
    keepAi: "Keep AI Suggestion",
    upgradeP1: "Upgrade to Priority 1",
    downgradeP2: "Downgrade to Priority 2",
    markNonReportable: "Mark as Non-Reportable",
    actReviewTitle: "AGED CARE ACT 2024 - AUTHORISED REVIEW REQUIRED",
    actReviewDesc: "Compliance review gate: AI has flagged this reportable incident as potentially Priority 1 under current ACQSC guidance. A downgrade cannot be submitted through this screen until an authorised reviewer records the supporting evidence and rationale. AI provides decision support; the registered provider remains responsible for the final assessment.",
    autoReportDraft: "Auto-Generated Report Draft",
    notificationsCheck: "Notifications Check",
    emergencyServices: "Emergency Services",
    familyNotified: "Family Notified",
    gpNotified: "GP Notified",
    yes: "Yes",
    no: "No",
    liveUnavailable: "⚠️ Live ACQSC verification unavailable.",
    liveUnavailableDesc: "This preliminary assessment cannot be used for submission. Please verify against the official ACQSC guidance.",
    notified: "Notified",
    notifyManager: "Notify Manager/RN",
    authorisedReview: "Authorised Review Required",
    manualVerification: "Manual Verification Required",
    approveFile: "Manager Approve & File",
    draftedEmail: "Drafted Email Content",
    sendViaEmail: "Send via Email Client",
    emailFailed: "Email failed:",
    complianceReminder: "Compliance reminder:",
    complianceReminderDesc: "Registered providers must notify Priority 1 SIRS incidents within 24 hours and Priority 2 incidents within 30 calendar days. This AI output is decision support and must be reviewed against current ACQSC guidance and the provider's incident-management process.",
    notReportable: "Not SIRS Reportable",
    notReportableDesc: "Based on the SIRS criteria, this incident does not meet the threshold for mandatory ACQSC reporting. Please log it in your internal clinical management system.",
  },
  zh: {
    cancelBack: "取消并返回",
    title: "SIRS 事件上报器",
    subtitle: "AI 辅助的严重事件应对方案(SIRS)上报",
    analyzing: "Gemini 正在核对合规标准并起草报告。",
    savedOffline: "已离线保存",
    savedOfflineDesc: "报告已本地保存,恢复网络后将自动分析。",
    returnDashboard: "返回仪表板",
    recordVoice: "录制语音",
    startRecording: "开始录音",
    stopRecording: "停止录音",
    audioAttached: "已附语音",
    attachPhoto: "附加照片",
    takePhoto: "拍摄 / 选择照片",
    narrative: "事件描述(若已用语音/照片则可选)",
    simulateTagalog: "模拟他加禄语示例",
    narrativePlaceholder: "例如:陈先生在浴室滑倒,手臂擦伤……(也可以直接录语音)",
    errorLabel: "错误:",
    analyzeCompliance: "分析合规性",
    preparingPack: "正在准备 SIRS 上报材料……",
    preparingPackDesc: "正在汇编草稿,并通过 Gmail API 向经理/护士发送内部通知。",
    packPrepared: "SIRS 上报材料已准备",
    packPreparedDesc1: "已生成草稿,供授权人员在法定的",
    windowP1: "24 小时",
    windowP2: "30 天",
    packPreparedDesc2: "时限内通过 My Aged Care 服务与支持门户正式提交。",
    internalNotice: "已通过 Gmail API 向经理/护士发送内部通知。正式的 SIRS 通报仍须由授权人员通过 My Aged Care 服务与支持门户提交。",
    ccText: "该长者的全科医生(GP)及家属联系人",
    whatHappened: "事件经过",
    immediateSafety: "即时安全措施",
    regulatorNotification: "监管机构通报",
    reportRequiredA: "需上报 SIRS 优先级",
    reportRequiredB: "报告",
    matchedCategory: "匹配类别:",
    aiConfidence: "AI 置信度:",
    aiUncertainty: "AI 不确定性:",
    verifiedSearch: "已通过实时 Google 搜索核实",
    searchDesc: "AI 在分类前对照当前 ACQSC 指南执行了以下搜索:",
    sourcesReferenced: "引用来源",
    officialReference: "官方参考:ACQSC 严重事件应对方案",
    rnOverride: "护士(RN)手动调整优先级",
    rnOverrideDesc: "手动覆盖 AI 的分类",
    keepAi: "保留 AI 建议",
    upgradeP1: "升级为优先级 1",
    downgradeP2: "降级为优先级 2",
    markNonReportable: "标记为无需上报",
    actReviewTitle: "《2024 安老法》——需授权复核",
    actReviewDesc: "合规复核关卡:AI 依据当前 ACQSC 指南将该可上报事件标记为可能的优先级 1。在授权复核人记录支持证据与理由之前,不能在本界面提交降级。AI 仅提供决策支持;最终判定责任仍在注册服务方。",
    autoReportDraft: "自动生成的报告草稿",
    notificationsCheck: "通报情况核对",
    emergencyServices: "紧急服务",
    familyNotified: "已通知家属",
    gpNotified: "已通知全科医生(GP)",
    yes: "是",
    no: "否",
    liveUnavailable: "⚠️ 实时 ACQSC 核实不可用。",
    liveUnavailableDesc: "该初步评估不能用于正式提交。请对照官方 ACQSC 指南核实。",
    notified: "已通知",
    notifyManager: "通知经理/护士",
    authorisedReview: "需授权复核",
    manualVerification: "需人工核实",
    approveFile: "经理审批并归档",
    draftedEmail: "邮件草稿内容",
    sendViaEmail: "用邮件客户端发送",
    emailFailed: "邮件发送失败:",
    complianceReminder: "合规提醒:",
    complianceReminderDesc: "注册服务方须在 24 小时内通报优先级 1 的 SIRS 事件、在 30 个日历日内通报优先级 2 事件。此 AI 输出为决策支持,须对照当前 ACQSC 指南及服务方的事件管理流程进行复核。",
    notReportable: "无需 SIRS 上报",
    notReportableDesc: "根据 SIRS 标准,该事件未达到强制向 ACQSC 上报的门槛。请在内部临床管理系统中登记。",
  },
};

interface SirsReporterProps {
  onCancel: () => void;
  onSubmit: (data: SIRSAlertData) => void;
  initialDescription?: string;
  initialSirsResult?: SIRSReport | null;
  residentName?: string;
}

export function SirsReporter({ onCancel, onSubmit, initialDescription = "", initialSirsResult = null, residentName = "Unknown" }: SirsReporterProps) {
  const { currentUser } = useAuth();
  const { isOnline, lang: language } = useLanguage();
  const L = SIRS_I18N[language] || SIRS_I18N.en;
  const [description, setDescription] = useState(initialDescription);
  const [draftEmail, setDraftEmail] = useState<{subject: string, body: string, to: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scrubbingStatus, setScrubbingStatus] = useState<string | null>(null);
  const [sirsResult, setSirsResult] = useState<SIRSReport | null>(initialSirsResult);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [overridePriority, setOverridePriority] = useState<number | null | 'none'>(null);
  
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => setAudioBase64(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is required to record audio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setImageBase64(dataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe();
  }, []);

  const handleEmailReport = async () => {
    if (!sirsResult) return;
    
    const title = sirsResult.incidentTitle || "Incident Report";
    const resident = sirsResult.residentName || "Unknown Resident";
    const sender = currentUser?.displayName || currentUser?.email || "Staff Member";
    
    const emailBody = `Title: ${title}
Resident: ${resident}
Reported By: ${sender}

Priority: ${sirsResult.priority}
Category: ${sirsResult.category}

What Happened:
${sirsResult.autofillReport.whatHappened}

Immediate Safety Actions:
${sirsResult.autofillReport.immediateSafetyActions}

Regulator Notification:
${sirsResult.autofillReport.regulatorNotification}
`.trim();
    
    const subject = `SIRS Priority ${sirsResult.priority} Draft Notice: ${title} - ${resident}`;
    const to = "compliance@sunrisecare.com.au";

    const isGoogleAuth = currentUser?.providerData?.some(p => p.providerId === 'google.com');

    if (!isGoogleAuth) {
      setDraftEmail({ subject, body: emailBody, to });
      setEmailStatus("error");
      setEmailError("Real Gmail authorization is required to send emails directly. Below is the drafted internal notification for the Manager/RN.");
      return;
    }

    setEmailStatus("sending");
    setEmailError(null);
    try {
      await sendGmailReport(to, subject, emailBody);
      setEmailStatus("sent");
    } catch (err: any) {
      console.error(err);
      setEmailStatus("error");
      setEmailError(err.message || "Failed to send email");
      setDraftEmail({ subject, body: emailBody, to });
    }
  };

  const handleAnalyze = async () => {
    if (!description.trim() && !audioBase64 && !imageBase64) return;

    if (!isOnline) {
      const scrubbedDescription = description ? scrubPII(description, residentName) : "";
      await addToOfflineQueue('sirsReport', { description: scrubbedDescription, audioBase64, imageBase64 });
      setIsSubmitted(true);
      return;
    }

    setIsProcessing(true);
    setScrubbingStatus('Initiating Edge Privacy Engine...');
    setSirsResult(null);
    setIsSubmitted(false);
    setIsSubmitting(false);
    setErrorMsg(null);
    setOverridePriority(null);

    try {
      await new Promise(r => setTimeout(r, 600));
      setScrubbingStatus('Scanning media & text for PII...');
      
      await new Promise(r => setTimeout(r, 600));
      setScrubbingStatus('Redacting identifiers locally...');
      
      const scrubbedDescription = description ? scrubPII(description, residentName) : "";

      await new Promise(r => setTimeout(r, 600));
      setScrubbingStatus('Encrypting sanitized payload for AI Analysis...');

      const res = await fetch("/api/sirs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: scrubbedDescription, audioBase64, imageBase64, language }),
      });
      
      setScrubbingStatus(null);

      const text = await res.text();
      if (text.trim().startsWith("<")) {
        console.error("Raw HTML response:", text);
        throw new Error(
          `请求被拦截 (HTTP ${res.status}): ${text.substring(0, 150)}... 请在【新标签页】中打开应用再试。(Please OPEN IN NEW TAB)`
        );
      }

      let data;
      try {
        const cleanedText = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        data = JSON.parse(cleanedText);
      } catch (e) {
        throw new Error(
          `Failed to parse response (Status ${res.status}): ${text.substring(0, 300)}`,
        );
      }

      if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`);
      setSirsResult(data.result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze SIRS incident.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = () => {
    if (!sirsResult) return;
    setIsSubmitting(true);
    // Actually file the report so the manager's SIRS hub receives it in real time
    // (demo: local store; real deployment: Firestore). Previously this was a mock
    // that only flipped the UI, so nothing ever reached the manager.
    void submitSirsEvent({
      ...sirsResult,
      status: "pending",
      residentName,
      reporterName: currentUser?.displayName || "Caregiver",
      reportInfo: sirsResult,
    });
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  const handleFinish = () => {
    if (!sirsResult) return;
    
    let finalPriority = sirsResult.priority;
    if (overridePriority !== null && overridePriority !== 'none') {
      finalPriority = Number(overridePriority) as 1 | 2;
    } else if (overridePriority === 'none') {
       onCancel();
       return;
    }

    onSubmit({
      priority: (finalPriority || 2) as 1 | 2, // default to 2 if somehow null
      message: sirsResult.autofillReport?.whatHappened || 'Incident report',
      reportInfo: sirsResult,
    });
  };

  const getPriorityValue = (p: number | null | 'none' | undefined) => p === 1 ? 1 : (p === 2 ? 2 : 99);
  const currentPriorityVal = overridePriority !== null ? getPriorityValue(overridePriority) : getPriorityValue(sirsResult?.priority);
  const aiPriorityVal = getPriorityValue(sirsResult?.priority);
  const isBreach = aiPriorityVal === 1 && currentPriorityVal > aiPriorityVal;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        {L.cancelBack}
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-6 text-white flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <div>
            <h1 className="text-2xl font-bold">{L.title}</h1>
            <p className="text-slate-400">
              {L.subtitle}
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {isProcessing ? (
            <div className="h-64 border border-slate-200 rounded-2xl bg-slate-900 p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
              {scrubbingStatus ? (
                <div className="relative z-10 w-full max-w-md mx-auto text-left flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mb-6 animate-pulse">
                     <ShieldAlert className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="w-full bg-black/50 border border-emerald-500/30 rounded-lg p-4 font-mono text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <div className="text-emerald-400 flex items-center gap-2 mb-2 border-b border-emerald-500/30 pb-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                      EDGE PRIVACY ENGINE
                    </div>
                    <div className="text-emerald-300/80 animate-in fade-in slide-in-from-bottom-1">
                      {">"} {scrubbingStatus}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10">
                  <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4 mx-auto" />
                  <h3 className="text-xl font-bold text-slate-100">
                    <CountdownTimer />
                  </h3>
                  <p className="text-slate-400 mt-2">
                    {L.analyzing}
                  </p>
                </div>
              )}
            </div>
          ) : (isSubmitted && !isOnline) ? (
            <div className="bg-white p-8 rounded-2xl border border-amber-200 shadow-sm animate-in zoom-in-95">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-amber-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  {L.savedOffline}
                </h2>
                <p className="text-amber-700 font-medium">
                  {L.savedOfflineDesc}
                </p>
              </div>
              <div className="flex justify-center mt-8">
                <button
                  onClick={onCancel}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 px-8 rounded-xl transition-colors"
                >
                  {L.returnDashboard}
                </button>
              </div>
            </div>
          ) : !sirsResult ? (
            <div className="space-y-6">
              
              {/* Media Inputs (Voice & Image) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    {L.recordVoice}
                  </label>
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="bg-red-50 hover:bg-red-100 text-red-600 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 text-sm border border-red-200"
                      >
                        <Mic className="w-4 h-4" /> {L.startRecording}
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl transition-colors flex items-center gap-2 text-sm animate-pulse"
                      >
                        <MicOff className="w-4 h-4" /> {L.stopRecording}
                      </button>
                    )}
                    {audioBase64 && !isRecording && (
                      <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                        <CheckCircle className="w-4 h-4" /> {L.audioAttached}
                        <button onClick={() => setAudioBase64(null)} className="ml-2 hover:text-emerald-800">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                    {L.attachPhoto}
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-4 rounded-xl transition-colors flex items-center gap-2 text-sm border border-slate-300"
                    >
                      <Camera className="w-4 h-4" /> {L.takePhoto}
                    </button>
                  </div>
                  {imageBase64 && (
                    <div className="mt-2 relative inline-block">
                      <img src={imageBase64} alt="Incident" className="h-20 w-20 object-cover rounded-lg border border-slate-300" />
                      <button 
                        onClick={() => setImageBase64(null)}
                        className="absolute -top-2 -right-2 bg-white rounded-full text-slate-500 hover:text-red-500 shadow-sm border border-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-bold text-slate-700 uppercase">
                    {L.narrative}
                  </label>
                  <button 
                    onClick={() => setDescription("Nakita kong itinulak ng isang staff member si Mr. Chen habang tinutulungan siyang tumayo. Natumba siya at nasugatan ang kanyang braso. Sinuri siya ng RN at kinailangang gamutin ang sugat. Ipinaalam ko agad ito sa manager.")}
                    className="text-xs text-indigo-600 font-bold hover:underline flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                  >
                    <Mic className="w-3 h-3" /> {L.simulateTagalog}
                  </button>
                </div>
                <textarea
                  className="w-full border border-slate-300 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  placeholder={L.narrativePlaceholder}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-xl text-sm mb-4">
                  <strong>{L.errorLabel} </strong> {errorMsg}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={!description.trim() && !audioBase64 && !imageBase64}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Cpu className="w-5 h-5" /> {L.analyzeCompliance}
                </button>
              </div>
            </div>
          ) : isSubmitting ? (
            <div className="h-64 border border-slate-200 rounded-2xl bg-slate-50 p-10 flex flex-col items-center justify-center text-center animate-in fade-in">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <h3 className="text-xl font-bold text-slate-800">
                {L.preparingPack}
              </h3>
              <p className="text-slate-500 mt-2">
                {L.preparingPackDesc}
              </p>
            </div>
          ) : isSubmitted && sirsResult ? (
            <div className="bg-white p-8 rounded-2xl border border-emerald-200 shadow-sm animate-in zoom-in-95">
              <div className="flex flex-col items-center text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">
                  {L.packPrepared} <span>&#10003;</span>
                </h2>
                <p className="text-emerald-700 font-medium">
                  {L.packPreparedDesc1}{" "}
                  {sirsResult.priority === 1 ? L.windowP1 : L.windowP2}{" "}
                  {L.packPreparedDesc2}
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-8 text-left">
                <div className="flex items-center gap-2 mb-4 text-slate-500 text-sm border-b border-slate-200 pb-4">
                  <Send className="w-4 h-4" />
                  <span>
                    {L.internalNotice}
                  </span>
                </div>

                <div className="space-y-3 font-mono text-sm text-slate-700 mb-6 border-b border-slate-200 pb-4">
                  <div>
                    <span className="text-slate-400">To:</span>{" "}
                    compliance@sunrisecare.com.au
                  </div>
                  <div>
                    <span className="text-slate-400">CC:</span> {L.ccText}
                  </div>
                  <div>
                    <span className="text-slate-400">Subject:</span> SIRS
                    Priority {sirsResult.priority} Report: {sirsResult.incidentTitle || "Incident Report"} - {sirsResult.residentName || "Unknown Resident"}
                  </div>
                </div>

                <div className="space-y-4 text-sm text-slate-800">
                  <p>
                    <strong>{L.whatHappened}:</strong>
                    <br />
                    {sirsResult.autofillReport.whatHappened}
                  </p>
                  <p>
                    <strong>{L.immediateSafety}:</strong>
                    <br />
                    {sirsResult.autofillReport.immediateSafetyActions}
                  </p>
                  <p>
                    <strong>{L.regulatorNotification}:</strong>
                    <br />
                    {sirsResult.autofillReport.regulatorNotification}
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleFinish}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-8 rounded-xl transition-colors"
                >
                  {L.returnDashboard}
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4">
              {sirsResult.isReportable ? (
                <div className="space-y-6">
                  <div
                    className={`p-8 rounded-2xl border-2 ${sirsResult.priority === 1 ? "bg-red-600 border-red-700 text-white" : "bg-amber-50 border-amber-200 text-amber-900"}`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      {sirsResult.priority === 1 ? (
                        <Flame className="w-8 h-8 text-white" />
                      ) : (
                        <ShieldAlert className="w-8 h-8 text-amber-500" />
                      )}
                      <h2
                        className={`text-2xl font-bold ${sirsResult.priority === 1 ? "text-white" : "text-amber-900"}`}
                      >
                        {L.reportRequiredA} {sirsResult.priority} {L.reportRequiredB}
                      </h2>
                    </div>
                    <p
                      className={`${sirsResult.priority === 1 ? "text-red-100" : "text-amber-700"} font-medium text-lg`}
                    >
                      {L.matchedCategory} {sirsResult.category}
                    </p>
                    
                    {sirsResult.confidenceScore && (
                      <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${sirsResult.confidenceScore < 70 ? 'bg-orange-100 text-orange-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        {L.aiConfidence} {sirsResult.confidenceScore}%
                      </div>
                    )}
                    {sirsResult.uncertaintyFlag && (
                      <div className="mt-3 bg-white/20 p-3 rounded-lg text-sm">
                        <strong>{L.aiUncertainty}</strong> {sirsResult.uncertaintyFlag}
                      </div>
                    )}
                  </div>
                  
                  {((sirsResult.groundingSources && sirsResult.groundingSources.length > 0) || (sirsResult.searchQueries && sirsResult.searchQueries.length > 0)) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-1 text-slate-700">
                        <Search className="w-5 h-5 text-indigo-500" />
                        <h4 className="font-bold text-sm">{L.verifiedSearch}</h4>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">{L.searchDesc}</p>
                      
                      <div className="space-y-2 mb-4">
                        {sirsResult.searchQueries?.map((query, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-md px-3 py-1.5 font-mono">
                            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{query}</span>
                          </div>
                        ))}
                      </div>

                      {sirsResult.groundingSources && sirsResult.groundingSources.length > 0 && (
                        <div className="space-y-3 mb-4 pt-4 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{L.sourcesReferenced}</p>
                          {sirsResult.groundingSources.map((source, idx) => {
                            let domain = '';
                            try {
                              domain = new URL(source.uri).hostname.replace('www.', '');
                            } catch (e) {
                              domain = 'Source';
                            }
                            return (
                              <a 
                                key={idx} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="block group"
                              >
                                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mb-0.5 uppercase tracking-wider">
                                  <Globe className="w-3 h-3" />
                                  {domain}
                                </div>
                                <div className="text-sm text-slate-600 group-hover:text-indigo-600 font-medium leading-tight transition-colors">
                                  {source.title}
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      )}

                      <div className="pt-3 border-t border-slate-200">
                        <a 
                          href="https://www.agedcarequality.gov.au/providers/serious-incident-response-scheme"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          {L.officialReference}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Override Section */}
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{L.rnOverride}</h4>
                      <p className="text-xs text-slate-500">{L.rnOverrideDesc}</p>
                    </div>
                    <select 
                      className="border border-slate-300 rounded p-2 text-sm"
                      value={overridePriority === null ? '' : overridePriority}
                      onChange={(e) => setOverridePriority(e.target.value ? (e.target.value === 'none' ? 'none' : Number(e.target.value)) : null)}
                    >
                      <option value="">{L.keepAi} (P{sirsResult.priority})</option>
                      {sirsResult.priority !== 1 && <option value="1">{L.upgradeP1}</option>}
                      {sirsResult.priority !== 2 && <option value="2">{L.downgradeP2}</option>}
                      <option value="none">{L.markNonReportable}</option>
                    </select>
                  </div>

                  {isBreach && (
                    <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-r-xl shadow-sm animate-in slide-in-from-top-2">
                      <div className="flex items-center gap-2 text-red-800 font-bold mb-2">
                        <ShieldAlert className="w-6 h-6 animate-pulse" />
                        {L.actReviewTitle}
                      </div>
                      <p className="text-sm text-red-700 font-medium leading-relaxed">
                        {L.actReviewDesc}
                      </p>
                    </div>
                  )}

                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                    <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2">
                      {L.autoReportDraft}
                    </h3>

                    <div>
                      <span className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        {L.whatHappened}
                      </span>
                      <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                        {sirsResult.autofillReport.whatHappened}
                      </p>
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        {L.immediateSafety}
                      </span>
                      <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                        {sirsResult.autofillReport.immediateSafetyActions}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          {L.regulatorNotification}
                        </span>
                        <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200">
                          {sirsResult.autofillReport.regulatorNotification}
                        </p>
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          {L.notificationsCheck}
                        </span>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">
                              {L.emergencyServices}
                            </span>
                            <span
                              className={
                                sirsResult.autofillReport
                                  .emergencyServicesNotified
                                  ? "text-emerald-600 font-bold"
                                  : "text-slate-400 font-bold"
                              }
                            >
                              {sirsResult.autofillReport
                                .emergencyServicesNotified
                                ? L.yes
                                : L.no}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">
                              {L.familyNotified}
                            </span>
                            <span
                              className={
                                sirsResult.autofillReport.familyNotified
                                  ? "text-emerald-600 font-bold"
                                  : "text-slate-400 font-bold"
                              }
                            >
                              {sirsResult.autofillReport.familyNotified
                                ? L.yes
                                : L.no}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">{L.gpNotified}</span>
                            <span
                              className={
                                sirsResult.autofillReport.gpNotified
                                  ? "text-emerald-600 font-bold"
                                  : "text-slate-400 font-bold"
                              }
                            >
                              {sirsResult.autofillReport.gpNotified
                                ? L.yes
                                : L.no}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {sirsResult.submissionBlocked && (
                    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-sm text-amber-800">
                      <strong>{L.liveUnavailable}</strong>{" "}
                      {L.liveUnavailableDesc}
                    </div>
                  )}
                  <div className="flex justify-end pt-4 gap-4">
                    <button
                      onClick={handleEmailReport}
                      disabled={emailStatus === "sending" || emailStatus === "sent"}
                      className={`font-bold py-3 px-6 rounded-xl transition-colors flex items-center gap-2 ${emailStatus === "sent" ? "bg-emerald-100 text-emerald-800" : "bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"}`}
                    >
                      {emailStatus === "sending" && <Loader2 className="w-5 h-5 animate-spin" />}
                      {emailStatus === "sent" && <CheckCircle className="w-5 h-5" />}
                      {emailStatus === "idle" || emailStatus === "error" ? <Mail className="w-5 h-5" /> : null}
                      {emailStatus === "sent" ? L.notified : L.notifyManager}
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isBreach || !!sirsResult.submissionBlocked}
                      className={`font-bold py-3 px-8 rounded-xl transition-all duration-300 flex items-center gap-2 shadow-sm ${
                        isBreach
                          ? 'bg-red-50 text-red-600 border border-red-300 cursor-not-allowed opacity-90 scale-98 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                          : sirsResult.submissionBlocked
                          ? 'bg-amber-50 text-amber-700 border border-amber-300 cursor-not-allowed opacity-90'
                          : 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-md'
                      }`}
                    >
                      {isBreach ? (
                        <>
                          <Lock className="w-5 h-5 text-red-500 animate-pulse" />
                          {L.authorisedReview}
                        </>
                      ) : sirsResult.submissionBlocked ? (
                        <>
                          <Lock className="w-5 h-5" />
                          {L.manualVerification}
                        </>
                      ) : (
                        <>
                          {L.approveFile}
                          <Send className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                  
                  {draftEmail && (
                    <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-6 text-left">
                      <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {L.draftedEmail}
                      </h4>
                      <div className="space-y-2 mb-4 text-sm bg-white p-4 rounded-lg border border-slate-200">
                        <p><span className="font-semibold text-slate-500">To:</span> {draftEmail.to}</p>
                        <p><span className="font-semibold text-slate-500">Subject:</span> {draftEmail.subject}</p>
                        <hr className="my-2 border-slate-100" />
                        <pre className="whitespace-pre-wrap font-sans text-slate-700 mt-2">{draftEmail.body}</pre>
                      </div>
                      <a 
                        href={`mailto:${draftEmail.to}?subject=${encodeURIComponent(draftEmail.subject)}&body=${encodeURIComponent(draftEmail.body)}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        {L.sendViaEmail}
                      </a>
                    </div>
                  )}
                  
                  {emailError && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                      <strong>{L.emailFailed}</strong> {emailError}
                    </div>
                  )}

                  <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded-xl text-sm text-red-800 flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
                    <div>
                      <strong>{L.complianceReminder}</strong> {L.complianceReminderDesc}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-xl text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-emerald-900 mb-2">
                    {L.notReportable}
                  </h2>
                  <p className="text-emerald-700">
                    {L.notReportableDesc}
                  </p>
                  <button
                    onClick={onCancel}
                    className="mt-6 bg-white border border-emerald-300 text-emerald-800 font-bold py-2 px-6 rounded-lg transition-colors hover:bg-emerald-100"
                  >
                    {L.returnDashboard}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
