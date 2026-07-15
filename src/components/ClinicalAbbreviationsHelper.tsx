import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { Search, ChevronDown, ChevronUp, CheckCircle, FileText, HelpCircle, BookOpen } from "lucide-react";

interface Abbreviation {
  code: string;
  fullName: string;
  meaningEn: string;
  meaningZh: string;
  category: "adl" | "med" | "clinical" | "other";
  exampleEn: string;
}

interface ClinicalAbbreviationsHelperProps {
  onInsertAbbreviation: (text: string) => void;
}

const ABBREVIATIONS_DATA: Abbreviation[] = [
  {
    code: "ADL",
    fullName: "Activities of Daily Living",
    meaningEn: "Routine activities people do every day (eating, bathing, dressing, toileting).",
    meaningZh: "日常生活活动（如进食、洗澡、穿衣、上厕所）。",
    category: "adl",
    exampleEn: "Resident independent with ADLs today except requiring supervision with bathing."
  },
  {
    code: "PRN",
    fullName: "Pro Re Nata",
    meaningEn: "As needed. Used for medications or actions taken when required, not scheduled.",
    meaningZh: "必要时（非定时给药/措施，有症状时才用）。",
    category: "med",
    exampleEn: "Paracetamol 1g administered PRN for mild hip pain."
  },
  {
    code: "BD",
    fullName: "Bis die",
    meaningEn: "Twice daily. Standard medication frequency identifier in Australian clinical charts.",
    meaningZh: "每日两次。澳洲临床病历标准用药频次。",
    category: "med",
    exampleEn: "Amlodipine 5mg administered BD as chartered."
  },
  {
    code: "TID / TDS",
    fullName: "Ter in die / Ter die sumendum",
    meaningEn: "Three times daily. Standard medication frequency.",
    meaningZh: "每日三次。标准用药频次。",
    category: "med",
    exampleEn: "Metformin 500mg administered TDS with meals."
  },
  {
    code: "BO",
    fullName: "Bowels Opened",
    meaningEn: "Passed stool. Crucial monitoring item in aged care bowel management plans.",
    meaningZh: "已排便。长者大便管理计划中的核心监测指标。",
    category: "adl",
    exampleEn: "Resident reports BO x1, small amount, soft. Bristol Type 4."
  },
  {
    code: "PU",
    fullName: "Passed Urine",
    meaningEn: "Urinated. Monitored for hydration and urinary tract infection (UTI) screening.",
    meaningZh: "已排尿。用于监测脱水和排查尿路感染（UTI）。",
    category: "adl",
    exampleEn: "PU x3 during shift, clear yellow, no dysuria reported."
  },
  {
    code: "IDC",
    fullName: "Indwelling Catheter",
    meaningEn: "A catheter left in the bladder to drain urine.",
    meaningZh: "留置导尿管。留置于膀胱内以排出尿液的管道。",
    category: "clinical",
    exampleEn: "IDC bag emptied of 400ml amber urine. Catheter care completed."
  },
  {
    code: "Skin tear",
    fullName: "Skin Tear (Type I/II/III)",
    meaningEn: "Traumatic wound occurring on extremities in frail skin. Reportable on clinical systems.",
    meaningZh: "皮肤撕裂伤（分一/二/三型）。脆弱皮肤因外伤导致的裂口。",
    category: "clinical",
    exampleEn: "Slight Type I skin tear observed on right forearm, clean edge. Dressing applied, RN reviewed."
  },
  {
    code: "Pressure injury",
    fullName: "Pressure Injury (Stage 1-4)",
    meaningEn: "Localized damage to skin/underlying tissue over bony prominence from pressure.",
    meaningZh: "压疮（1-4期）。因受压导致骨突出处皮肤或深部组织的局限性损伤。",
    category: "clinical",
    exampleEn: "Stage 1 pressure injury observed on sacrum, non-blanchable erythema. Repositioned 2-hourly."
  },
  {
    code: "SIRS",
    fullName: "Serious Incident Response Scheme",
    meaningEn: "Mandatory incident reporting framework for Australian aged care providers under ACQSC.",
    meaningZh: "严重事件响应计划。澳洲ACQSC规定的强制性事件报告框架。",
    category: "other",
    exampleEn: "Incident classified as SIRS Priority 1 due to head strike during fall; reportable in 24h."
  },
  {
    code: "ISBAR",
    fullName: "Identify, Situation, Background, Assessment, Recommendation",
    meaningEn: "Standardized clinical handoff and documentation structure used in Australia.",
    meaningZh: "标准临床交接及记录结构（确认、情况、背景、评估、建议）。",
    category: "other",
    exampleEn: "Documentation structured in ISBAR format to ensure compliance with aged care standards."
  },
  {
    code: "SOAP",
    fullName: "Subjective, Objective, Assessment, Plan",
    meaningEn: "Method of documentation employed by healthcare providers to write out progress notes.",
    meaningZh: "临床病程记录书写结构（主观、客观、评估、计划）。",
    category: "other",
    exampleEn: "SOAP layout utilized to clarify resident symptom trends for next shift."
  }
];

export function ClinicalAbbreviationsHelper({ onInsertAbbreviation }: ClinicalAbbreviationsHelperProps) {
  const { lang, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "adl" | "med" | "clinical" | "other">("all");
  const [activeTab, setActiveTab] = useState<"dictionary" | "templates">("dictionary");

  const filteredItems = ABBREVIATIONS_DATA.filter((item) => {
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.meaningEn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.meaningZh.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === "all" || item.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="border border-indigo-100 rounded-2xl bg-gradient-to-br from-indigo-50/40 to-slate-50/50 shadow-sm overflow-hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-indigo-50/30 transition-colors focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-indigo-600 animate-pulse" />
          <div>
            <h4 className="font-bold text-slate-800 text-sm sm:text-base">
              {lang === "zh" ? "🇦🇺 澳洲临床英语与标准缩写助手" : "🇦🇺 Aussie Clinical English & Shorthand Scribe"}
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {lang === "zh" 
                ? "提供合规病程记录缩写、专业词汇对照及 ISBAR/SOAP 范本" 
                : "Provides compliant chart abbreviations, medical glossaries, and ISBAR templates"}
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-indigo-500" />}
      </button>

      {isOpen && (
        <div className="border-t border-indigo-100/60 p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Sub Tabs */}
          <div className="flex border-b border-indigo-100/40 mb-4">
            <button
              onClick={() => setActiveTab("dictionary")}
              className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "dictionary"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {lang === "zh" ? "专业缩写词典" : "Clinical Glossary"}
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`pb-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === "templates"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {lang === "zh" ? "ISBAR/SOAP 专业书写规范" : "Clinical Notes Framework"}
            </button>
          </div>

          {activeTab === "dictionary" ? (
            <div className="space-y-4">
              {/* Search & Categories */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === "zh" ? "搜索澳洲缩写或释义..." : "Search abbreviations..."}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-indigo-100 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-indigo-300"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "adl", "med", "clinical", "other"] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        activeCategory === cat
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                      }`}
                    >
                      {cat === "all" ? (lang === "zh" ? "全部" : "All") : 
                       cat === "adl" ? (lang === "zh" ? "日常活动 ADLs" : "ADLs") :
                       cat === "med" ? (lang === "zh" ? "给药 Medication" : "Medication") :
                       cat === "clinical" ? (lang === "zh" ? "临床体征 Clinical" : "Clinical") : 
                       (lang === "zh" ? "框架框架 Frameworks" : "Frameworks")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid of Dictionary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredItems.length === 0 ? (
                  <p className="text-slate-400 text-xs italic text-center col-span-2 py-4">
                    {lang === "zh" ? "未找到符合的临床标准词汇" : "No clinical shorthand match found."}
                  </p>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.code}
                      onClick={() => onInsertAbbreviation(item.code)}
                      className="bg-white border border-indigo-50 hover:border-indigo-300 hover:bg-indigo-50/20 p-3 rounded-xl transition-all cursor-pointer group flex flex-col justify-between"
                      title="Click to insert abbreviation code"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-indigo-700 font-mono group-hover:scale-105 transition-transform">
                            {item.code}
                          </span>
                          <span className="text-[10px] font-normal uppercase tracking-wider text-slate-400">
                            {item.fullName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-2 font-medium leading-relaxed">
                          {lang === "zh" ? item.meaningZh : item.meaningEn}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">
                          En: {item.meaningEn}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-indigo-50/50 flex justify-between items-center text-[9px]">
                        <span className="text-slate-400 font-mono italic max-w-[80%] truncate">
                          e.g. "{item.exampleEn}"
                        </span>
                        <span className="text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider shrink-0">
                          {lang === "zh" ? "点击插入 +" : "Insert +"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 font-medium">
              {/* ISBAR Framework */}
              <div className="bg-white border border-indigo-100 p-4 rounded-xl space-y-3">
                <h5 className="font-bold text-indigo-700 text-sm border-b border-indigo-100 pb-2 flex items-center justify-between">
                  <span>ISBAR 临床汇报规范</span>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">Aussie Standard</span>
                </h5>
                <ul className="space-y-2.5">
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">I - Identify (确认长者/汇报人)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "I am Sarah (Caregiver) reporting on Joyce (Room 101)."
                    </span>
                  </li>
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">S - Situation (当前状况)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "Joyce was found sitting on the floor beside her bed."
                    </span>
                  </li>
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">B - Background (病史背景)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "Resident has moderate dementia and history of osteoporosis."
                    </span>
                  </li>
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">A - Assessment (现状评估)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "Alert and responsive. No visible bleeding. Reports slight pain in left knee."
                    </span>
                  </li>
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">R - Recommendation (处置建议)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "Requesting RN to complete fall assessment and neurological observation check."
                    </span>
                  </li>
                </ul>
                <button
                  onClick={() => onInsertAbbreviation("ISBAR Structure Checklist:\n- I (Identify):\n- S (Situation):\n- B (Background):\n- A (Assessment):\n- R (Recommendation):")}
                  className="w-full mt-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-center font-bold text-[10px] transition-colors"
                >
                  {lang === "zh" ? "在输入框中填入 ISBAR 模板" : "Insert ISBAR Template"}
                </button>
              </div>

              {/* SOAP Framework */}
              <div className="bg-white border border-indigo-100 p-4 rounded-xl space-y-3">
                <h5 className="font-bold text-indigo-700 text-sm border-b border-indigo-100 pb-2 flex items-center justify-between">
                  <span>SOAP 病程记录规范</span>
                  <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">Clinical Scribe</span>
                </h5>
                <ul className="space-y-2.5">
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">S - Subjective (长者自述/主观描述)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "Resident stated: 'I felt dizzy and slipped.'"
                    </span>
                  </li>
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">O - Objective (视觉观察/客观体征)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "Observed 2cm Stage 1 bruising on left patella. No active bleeding."
                    </span>
                  </li>
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">A - Assessment (临床评估/风险标记)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "Slight mobility risk detected. Post-fall assessment required."
                    </span>
                  </li>
                  <li>
                    <strong className="text-indigo-600 font-bold block font-mono">P - Plan (后续护理计划)</strong>
                    <span className="text-[11px] text-slate-500 block font-light">
                      "RN notified. PRN pain relief given. Ice pack applied. Monitor vitals 2h."
                    </span>
                  </li>
                </ul>
                <button
                  onClick={() => onInsertAbbreviation("SOAP Note Format:\n- S (Subjective):\n- O (Objective):\n- A (Assessment):\n- P (Plan):")}
                  className="w-full mt-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-center font-bold text-[10px] transition-colors"
                >
                  {lang === "zh" ? "在输入框中填入 SOAP 模板" : "Insert SOAP Template"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
