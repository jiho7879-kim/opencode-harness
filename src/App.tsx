import React, { useState, useEffect } from "react";
import {
  Play,
  RotateCcw,
  AlertCircle,
  FileText,
  CheckCircle2,
  Shield,
  Settings,
  ChevronRight,
  Terminal,
  Info,
  Globe,
  HelpCircle,
  Code,
  Award,
  Copy,
  Check,
  Eye,
  RefreshCw,
  FolderSync,
  Layers,
  Sparkles,
  BookOpen,
  Presentation
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { WorkflowType, AgentRole, TaskState, HarnessState, AuditLogEntry } from "./types";

export default function App() {
  // State initialization
  const [state, setState] = useState<HarnessState>({
    currentWorkflow: WorkflowType.PROJECT_CODING,
    rawRequirement: "usr-9901 계정의 SQLite 잔고 조회 쿼리 및 실행 결과를 마크다운 테이블로 출력하고, 관련 PPT 기획 슬라이드를 제작해라.",
    isOrchestrating: false,
    currentStep: "Idle",
    iteration: 0,
    maxIterations: 3,
    ambiguityThreshold: 0.3,
    metrics: {
      planQuality: 0,
      planAdherence: 0,
      argumentCorrectness: 0,
      reasoningCoherence: 0,
      ambiguityScore: 1.0,
    },
    files: {
      tasks: [],
      review: [],
      done: [],
    },
    logs: [],
    thoughtChain: ["시스템이 준비되었습니다. 템플릿을 선택하고 오케스트레이션 루프를 시작해 보세요."],
    activeAgent: null,
    selectedFileContent: null,
  });

  const [simFolder, setSimFolder] = useState<string>("");
  const [apiEnabled, setApiEnabled] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "cli" | "agents-md">("dashboard");
  const [agentsMdContent, setAgentsMdContent] = useState<string>("");
  const [workspaceInput, setWorkspaceInput] = useState<string>("");

  useEffect(() => {
    if (simFolder && !workspaceInput) {
      setWorkspaceInput(simFolder);
    }
  }, [simFolder]);

  // Poll status from express backend
  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/harness/status");
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          currentWorkflow: data.currentWorkflow,
          rawRequirement: data.rawRequirement,
          isOrchestrating: data.isOrchestrating,
          currentStep: data.currentStep,
          iteration: data.iteration,
          maxIterations: data.maxIterations,
          ambiguityThreshold: data.ambiguityThreshold,
          metrics: data.metrics,
          files: data.files,
          logs: data.logs,
          thoughtChain: data.thoughtChain,
          activeAgent: data.activeAgent,
          config: data.config,
        }));
        setSimFolder(data.projectDir);
        setApiEnabled(data.apiEnabled);
      }
    } catch (err) {
      console.error("Failed to fetch harness status:", err);
    }
  };

  const handleWorkspaceChange = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!workspaceInput.trim()) return;
    try {
      const res = await fetch("/api/harness/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspacePath: workspaceInput }),
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error("Failed to switch workspace path:", err);
    }
  };

  // Poll state automatically if orchestrating
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Fetch agents.md initially
  useEffect(() => {
    const fetchAgentsMd = async () => {
      try {
        const res = await fetch("/api/harness/view-file?path=AGENTS.md");
        if (res.ok) {
          const data = await res.json();
          setAgentsMdContent(data.content);
        }
      } catch (err) {
        console.error("Failed to read AGENTS.md:", err);
      }
    };
    fetchAgentsMd();
  }, [activeTab]);

  // Handle Workflow Template Selection
  const selectWorkflow = (type: WorkflowType) => {
    let defaultReq = "";
    if (type === WorkflowType.PROJECT_CODING) {
      defaultReq = "usr-9901 계정의 SQLite 잔고 조회 쿼리 및 실행 결과를 마크다운 테이블로 출력하고, 관련 PPT 기획 슬라이드를 제작해라.";
    } else if (type === WorkflowType.MD_KNOWLEDGE) {
      defaultReq = "하이엔드 미니멀 파일 시스템 상태 머신 및 에이전트 인지적 격리 아키텍처에 대한 정량적 마크다운 지식베이스 문서를 작성해라.";
    } else if (type === WorkflowType.PPT_PREP) {
      defaultReq = "에이전트 행동 억제 스프린트 계약 패턴의 동작 메커니즘을 설명하는 4:3 비율의 프레젠테이션 XML 슬라이드를 설계해라.";
    }

    setState((prev) => ({
      ...prev,
      currentWorkflow: type,
      rawRequirement: defaultReq,
    }));
  };

  // Run initial bootstrap/setup workspace
  const handleInitWorkspace = async () => {
    try {
      const res = await fetch("/api/harness/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowType: state.currentWorkflow,
          rawRequirement: state.rawRequirement,
        }),
      });
      if (res.ok) {
        await fetchStatus();
      }
    } catch (err) {
      console.error("Error initializing workspace:", err);
    }
  };

  // Launch the orchestration loop
  const handleLaunchOrchestration = async () => {
    // First guarantee workspace is initialized with latest settings
    await handleInitWorkspace();

    try {
      await fetch("/api/harness/run", {
        method: "POST",
      });
      await fetchStatus();
    } catch (err) {
      console.error("Error running orchestration:", err);
    }
  };

  // Reset simulation
  const handleReset = async () => {
    try {
      const res = await fetch("/api/harness/reset", { method: "POST" });
      if (res.ok) {
        setState((prev) => ({
          ...prev,
          selectedFileContent: null,
        }));
        await fetchStatus();
      }
    } catch (err) {
      console.error("Error resetting simulation:", err);
    }
  };

  // Read a specific file content from simulated folders
  const handleViewFile = async (folder: string, name: string) => {
    try {
      const filePath = `${folder}/${name}`;
      const res = await fetch(`/api/harness/view-file?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          selectedFileContent: {
            path: filePath,
            content: data.content,
          },
        }));
      }
    } catch (err) {
      console.error("Error viewing file:", err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Styles helpers
  const getAgentColor = (role: AgentRole | string | null) => {
    if (role === AgentRole.PLANNER || role === "PLANNER") return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (role === AgentRole.EXECUTOR || role === "EXECUTOR") return "text-blue-600 bg-blue-50 border-blue-200";
    if (role === AgentRole.CRITIC || role === "CRITIC") return "text-rose-600 bg-rose-50 border-rose-200";
    return "text-slate-600 bg-slate-50 border-slate-200";
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Upper Navigation & Branding Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-slate-900 text-white p-2 rounded-lg">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-slate-900 flex items-center gap-2">
              Opencode Agent Harness
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full border border-slate-200 font-mono">v1.0.0</span>
            </h1>
            <p className="text-xs text-slate-500">지능형 상태 제어와 정량 검증을 결합한 멀티 에이전트 엔지니어링 하네스</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
              activeTab === "dashboard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            대시보드 시뮬레이터
          </button>
          <button
            onClick={() => setActiveTab("agents-md")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
              activeTab === "agents-md" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            AGENTS.md 규칙 설정
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
              activeTab === "cli" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            글로벌 CLI 가이드
          </button>
        </div>

        {/* API Key Status Banner */}
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            apiEnabled 
              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            <span className={`w-2 h-2 rounded-full ${apiEnabled ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`}></span>
            <span>{apiEnabled ? "Gemini Live API 활성" : "에뮬레이티드 오케스트레이터 가동 중"}</span>
          </div>
          
          <form onSubmit={handleWorkspaceChange} className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
            <span className="text-[10px] text-slate-400 font-bold font-mono">Workspace:</span>
            <input
              type="text"
              value={workspaceInput}
              onChange={(e) => setWorkspaceInput(e.target.value)}
              placeholder="프로젝트 폴더 경로"
              className="text-xs bg-transparent border-none focus:outline-none w-48 font-mono text-slate-700"
            />
            <button
              type="submit"
              className="text-[10px] bg-slate-800 text-white font-bold px-2 py-0.5 rounded hover:bg-slate-700 transition-colors cursor-pointer"
            >
              적용
            </button>
          </form>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 p-6 max-w-[1700px] w-full mx-auto grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* TAB 1: DASHBOARD SIMULATOR */}
        {activeTab === "dashboard" && (
          <>
            {/* COLUMN 1: CONFIGURATION & CONTROLS */}
            <div className="xl:col-span-1 flex flex-col space-y-6">
              {/* Card 1: Workflow Preset Templates */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold font-display text-slate-800 mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  3대 워크플로우 템플릿 선택
                </h3>
                
                <div className="space-y-3">
                  <button
                    disabled={state.isOrchestrating}
                    onClick={() => selectWorkflow(WorkflowType.PROJECT_CODING)}
                    className={`w-full flex items-start p-3 rounded-lg border text-left transition-all ${
                      state.currentWorkflow === WorkflowType.PROJECT_CODING
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    } ${state.isOrchestrating ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="mt-0.5 bg-blue-100 text-blue-700 p-1.5 rounded mr-3">
                      <Code className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">A. 코드 개발 (Project Coding)</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">클래스 매칭, SQLite 조회 엔진 및 사전 테스트 스키마 생성</p>
                    </div>
                  </button>

                  <button
                    disabled={state.isOrchestrating}
                    onClick={() => selectWorkflow(WorkflowType.MD_KNOWLEDGE)}
                    className={`w-full flex items-start p-3 rounded-lg border text-left transition-all ${
                      state.currentWorkflow === WorkflowType.MD_KNOWLEDGE
                        ? "border-emerald-500 bg-emerald-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    } ${state.isOrchestrating ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="mt-0.5 bg-emerald-100 text-emerald-700 p-1.5 rounded mr-3">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">B. 지식 아카이빙 (MD Knowledge)</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">위계 정리, 사실 관계 매핑 및 정보 깊이의 무결성 검증</p>
                    </div>
                  </button>

                  <button
                    disabled={state.isOrchestrating}
                    onClick={() => selectWorkflow(WorkflowType.PPT_PREP)}
                    className={`w-full flex items-start p-3 rounded-lg border text-left transition-all ${
                      state.currentWorkflow === WorkflowType.PPT_PREP
                        ? "border-purple-500 bg-purple-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    } ${state.isOrchestrating ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="mt-0.5 bg-purple-100 text-purple-700 p-1.5 rounded mr-3">
                      <Presentation className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">C. 발표 기획 및 디자인 (PPT Prep)</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">슬라이드 스토리보드, BBox 좌표 규격 및 디자인 시스템 가이드</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Card 2: Configuration & Requirements */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold font-display text-slate-800 mb-4 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-500" />
                    요구사항 및 제약 게이트 설정
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1.5">사용자 원시 요구사항 (Raw Requirement)</label>
                      <textarea
                        disabled={state.isOrchestrating}
                        value={state.rawRequirement}
                        onChange={(e) => setState({ ...state, rawRequirement: e.target.value })}
                        className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 font-sans min-h-[120px]"
                        placeholder="에이전트가 완성할 목표를 명시하세요..."
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] font-bold text-slate-500">모호성 허용 한계값 (Ambiguity Gate)</label>
                        <span className="text-xs font-mono font-bold text-slate-700">{state.ambiguityThreshold}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="0.8"
                        step="0.05"
                        disabled={state.isOrchestrating}
                        value={state.ambiguityThreshold}
                        onChange={(e) => setState({ ...state, ambiguityThreshold: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                      />
                      <span className="text-[9px] text-slate-400 block mt-1">계획서 내 TBD, 애매모호 지표 검증 임계치. 이하가 되어야 소스코드 작성 잠금이 해제됩니다.</span>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-slate-400" /> 행동 억제 상태</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          state.isOrchestrating && state.metrics.ambiguityScore > state.ambiguityThreshold
                            ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {state.isOrchestrating && state.metrics.ambiguityScore > state.ambiguityThreshold ? "물리 쓰기 LOCK" : "대기 중 / 해제"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="mt-6 space-y-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleLaunchOrchestration}
                    disabled={state.isOrchestrating}
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed py-2.5 px-4 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm"
                  >
                    {state.isOrchestrating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                        <span>오케스트레이션 실행 중...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
                        <span>하네스 오케스트레이션 구동</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleReset}
                    disabled={state.isOrchestrating}
                    className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 py-2 rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>작업 초기화 (Reset)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* COLUMN 2 & 3: MAIN VISUAL STATE MACHINE & LOGS */}
            <div className="xl:col-span-2 flex flex-col space-y-6">
              
              {/* Virtual State Machine Directory Structure Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* STATE 1: tasks/ */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col min-h-[170px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold font-display text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      tasks/ [대기 및 수렴]
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{state.files.tasks.length} files</span>
                  </div>
                  
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[130px] pr-1">
                    {state.files.tasks.length === 0 ? (
                      <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-lg p-4">
                        <p className="text-[10px] text-slate-400 text-center">대기 중인 요구 명세가 없습니다.</p>
                      </div>
                    ) : (
                      state.files.tasks.map((file) => (
                        <div
                          key={file}
                          onClick={() => handleViewFile("tasks", file)}
                          className="flex items-center justify-between p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                        >
                          <span className="text-xs text-slate-700 font-mono flex items-center gap-1.5 truncate">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            {file}
                          </span>
                          <Eye className="w-3 h-3 text-slate-400" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* STATE 2: review/ */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col min-h-[170px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold font-display text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      review/ [동적 검증]
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{state.files.review.length} files</span>
                  </div>
                  
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[130px] pr-1">
                    {state.files.review.length === 0 ? (
                      <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-lg p-4">
                        <p className="text-[10px] text-slate-400 text-center">피드백 검증 대기 중인 파일이 없습니다.</p>
                      </div>
                    ) : (
                      state.files.review.map((file) => (
                        <div
                          key={file}
                          onClick={() => handleViewFile("review", file)}
                          className="flex items-center justify-between p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                        >
                          <span className="text-xs text-slate-700 font-mono flex items-center gap-1.5 truncate">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            {file}
                          </span>
                          <Eye className="w-3 h-3 text-slate-400" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* STATE 3: done/ */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col min-h-[170px] relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold font-display text-slate-800 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      done/ [영구 안착]
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{state.files.done.length} files</span>
                  </div>
                  
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[130px] pr-1">
                    {state.files.done.length === 0 ? (
                      <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-lg p-4">
                        <p className="text-[10px] text-slate-400 text-center">최종 검증 완료 후 안착된 고정 자산이 없습니다.</p>
                      </div>
                    ) : (
                      state.files.done.map((file) => (
                        <div
                          key={file}
                          onClick={() => handleViewFile("done", file)}
                          className="flex items-center justify-between p-2 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-colors"
                        >
                          <span className="text-xs text-slate-700 font-mono flex items-center gap-1.5 truncate">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            {file}
                          </span>
                          <Eye className="w-3 h-3 text-slate-400" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Triangle Cognitive Topology Map SVG Visualization */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold font-display text-slate-800 mb-4 flex items-center gap-2">
                  <FolderSync className="w-4 h-4 text-slate-500" />
                  삼각 구도의 에이전트 인지 격리 아키텍처 (Topology)
                </h3>

                <div className="relative border border-slate-100 rounded-xl bg-slate-50/50 p-6 flex flex-col items-center justify-center min-h-[220px]">
                  {/* Outer Link Arrows */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <svg className="w-full h-full max-w-[450px] max-h-[180px]" viewBox="0 0 450 180">
                      {/* Planner -> Executor Arrow */}
                      <path d="M 120 40 L 330 40" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5,5" fill="none" />
                      <polygon points="330,37 337,40 330,43" fill="#94a3b8" />
                      
                      {/* Executor -> Critic Arrow */}
                      <path d="M 330 110 L 225 150" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                      <polygon points="229,146 220,152 223,142" fill="#94a3b8" />

                      {/* Critic -> Planner Feedback loop */}
                      <path d="M 225 150 L 120 110" stroke="#fda4af" strokeWidth="2" strokeDasharray="3,3" fill="none" />
                      <polygon points="123,115 116,108 126,107" fill="#f43f5e" />
                    </svg>
                  </div>

                  {/* Topology Nodes */}
                  <div className="flex w-full max-w-[500px] justify-between z-10">
                    
                    {/* Node A: Planner */}
                    <div className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-300 w-[140px] bg-white shadow-sm ${
                      state.activeAgent === AgentRole.PLANNER ? "ring-2 ring-emerald-500 border-emerald-500 scale-105" : "border-slate-200"
                    }`}>
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        State Configurator
                        {state.config?.agents?.planner && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Custom configuration loaded" />}
                      </span>
                      <div className="bg-emerald-100 text-emerald-800 p-2 rounded-lg mb-2">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">거시 설계자</h4>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5 text-center truncate w-full">
                        {state.config?.agents?.planner?.model || "Gemini 3.5 Flash"}
                      </span>
                      {state.config?.agents?.planner && (
                        <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-1 py-0.5 rounded-sm mt-1 scale-90 font-sans">
                          활성화됨 ✓
                        </span>
                      )}
                    </div>

                    {/* Node B: Executor */}
                    <div className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-300 w-[140px] bg-white shadow-sm ${
                      state.activeAgent === AgentRole.EXECUTOR ? "ring-2 ring-blue-500 border-blue-500 scale-105" : "border-slate-200"
                    }`}>
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        Local Craftsman
                        {state.config?.agents?.executor && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" title="Custom configuration loaded" />}
                      </span>
                      <div className="bg-blue-100 text-blue-800 p-2 rounded-lg mb-2">
                        <Code className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">국소적 장인</h4>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5 text-center truncate w-full">
                        {state.config?.agents?.executor?.model || "Qwen Coder 72B"}
                      </span>
                      {state.config?.agents?.executor && (
                        <span className="text-[8px] bg-blue-50 text-blue-600 border border-blue-100 px-1 py-0.5 rounded-sm mt-1 scale-90 font-sans">
                          활성화됨 ✓
                        </span>
                      )}
                    </div>

                  </div>

                  {/* Bottom Node C: Critic */}
                  <div className="mt-8 z-10 flex flex-col items-center">
                    <div className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-300 w-[140px] bg-white shadow-sm ${
                      state.activeAgent === AgentRole.CRITIC ? "ring-2 ring-rose-500 border-rose-500 scale-105" : "border-slate-200"
                    }`}>
                      <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        Strict Auditor
                        {state.config?.agents?.critic && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Custom configuration loaded" />}
                      </span>
                      <div className="bg-rose-100 text-rose-800 p-2 rounded-lg mb-2">
                        <Shield className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">냉혹한 검열관</h4>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5 text-center truncate w-full">
                        {state.config?.agents?.critic?.model || "DeepSeek-R1-70B"}
                      </span>
                      {state.config?.agents?.critic && (
                        <span className="text-[8px] bg-rose-50 text-rose-600 border border-rose-100 px-1 py-0.5 rounded-sm mt-1 scale-90 font-sans">
                          활성화됨 ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Thought Chain Terminal Terminal-like Viewer */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg flex-1 flex flex-col min-h-[300px]">
                <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
                  <div className="flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-semibold text-slate-300">Thought Chain Terminal Logs</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{state.currentStep}</span>
                </div>
                
                <div className="p-4 flex-1 overflow-y-auto space-y-3 font-mono text-xs text-slate-300 max-h-[350px]">
                  {state.thoughtChain.map((thought, idx) => (
                    <div key={idx} className="leading-relaxed border-l-2 border-slate-700 pl-3 py-0.5">
                      <span className="text-slate-500 select-none mr-2">[{idx + 1}]</span>
                      {thought}
                    </div>
                  ))}
                  {state.isOrchestrating && (
                    <div className="flex items-center space-x-2 text-emerald-400 animate-pulse pl-3">
                      <span>&gt;_ Agent loop active. Simulating thought vectors...</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* COLUMN 4: METRICS & AUDIT LEDGER */}
            <div className="xl:col-span-1 flex flex-col space-y-6">
              
              {/* Quantitative Metric Scoring Board */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold font-display text-slate-800 mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-slate-500" />
                  정량적 하네스 메트릭 보드 (DeepEval)
                </h3>

                <div className="space-y-4">
                  
                  {/* Metric: Ambiguity Score */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-slate-700">모호성 지표 (Ambiguity Score)</span>
                      <span className={`font-mono font-bold ${state.metrics.ambiguityScore <= state.ambiguityThreshold ? "text-emerald-600" : "text-amber-600"}`}>
                        {(state.metrics.ambiguityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${state.metrics.ambiguityScore <= state.ambiguityThreshold ? "bg-emerald-500" : "bg-amber-500"}`}
                        style={{ width: `${state.metrics.ambiguityScore * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-[9px] text-slate-400 block mt-1">허용 임계치: {state.ambiguityThreshold * 100}% 이하</span>
                  </div>

                  {/* Metric: Plan Quality */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-slate-700">계획 품질 (Plan Quality)</span>
                      <span className="font-mono font-bold text-slate-700">{(state.metrics.planQuality * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-800 transition-all duration-500"
                        style={{ width: `${state.metrics.planQuality * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric: Plan Adherence */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-slate-700">계획 준수율 (Plan Adherence)</span>
                      <span className="font-mono font-bold text-slate-700">{(state.metrics.planAdherence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 transition-all duration-500"
                        style={{ width: `${state.metrics.planAdherence * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric: Argument Correctness */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-slate-700">인수 유효성 (Argument Validation)</span>
                      <span className="font-mono font-bold text-slate-700">{(state.metrics.argumentCorrectness * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 transition-all duration-500"
                        style={{ width: `${state.metrics.argumentCorrectness * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Metric: Reasoning Coherence */}
                  <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-slate-700">추론 합리성 (Reasoning Coherence)</span>
                      <span className="font-mono font-bold text-slate-700">{(state.metrics.reasoningCoherence * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-violet-500 transition-all duration-500"
                        style={{ width: `${state.metrics.reasoningCoherence * 100}%` }}
                      ></div>
                    </div>
                  </div>

                </div>
              </div>

              {/* EU AI Act Hashed Traceability Audit Log Ledger */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex-1 flex flex-col min-h-[300px]">
                <h3 className="text-sm font-bold font-display text-slate-800 mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-500" />
                  글로벌 AI 규제 감사 로그 Ledger
                </h3>
                <p className="text-[10px] text-slate-400 mb-4">
                  EU AI Act 및 California AI Transparency Act에 따른 변경 감사 계보 기록 시스템 (SHA-256 Hashed Lineage).
                </p>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[320px]">
                  {state.logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-lg text-slate-400">
                      <Info className="w-5 h-5 mb-1.5" />
                      <span className="text-[10px] text-center">기록된 트랜잭션 내역이 없습니다.</span>
                    </div>
                  ) : (
                    state.logs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-[11px] leading-relaxed relative overflow-hidden">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-700">{log.action}</span>
                          <span className="font-mono text-[9px] text-slate-400 bg-slate-200/60 px-1 py-0.5 rounded">{log.hash}</span>
                        </div>
                        <p className="text-slate-600 mb-1.5">{log.details}</p>
                        <div className="flex flex-wrap gap-1.5 items-center justify-between border-t border-slate-200/50 pt-1.5 mt-1.5 text-[9px] text-slate-400">
                          <span className="bg-slate-200/50 px-1.5 py-0.5 rounded text-slate-500 font-mono">Agent: {log.agent}</span>
                          <span className="text-slate-500 underline decoration-dotted">{log.regulationChecked}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </>
        )}

        {/* TAB 2: AGENTS.MD RULES CONFIG */}
        {activeTab === "agents-md" && (
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-slate-500" />
                  동적 비즈니스 규칙서 (AGENTS.md)
                </h3>
                <p className="text-xs text-slate-500">에이전트가 동작을 개시하기 전에 동적으로 참조하는 조종 매뉴얼 및 준수 조건</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Path: simulated-project/AGENTS.md</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Markdown Editor / Read-only viewer */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">명문화된 동적 조종 매뉴얼</span>
                  <button
                    onClick={() => copyToClipboard(agentsMdContent, "agents-md-copy")}
                    className="flex items-center space-x-1 text-xs border border-slate-200 hover:bg-slate-50 text-slate-600 px-2.5 py-1 rounded"
                  >
                    {copiedText === "agents-md-copy" ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 font-bold">복사됨!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>전체 복사</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={agentsMdContent}
                  className="w-full h-[500px] p-4 border border-slate-200 rounded-xl bg-slate-50 font-mono text-xs text-slate-700 leading-relaxed focus:outline-none"
                />
              </div>

              {/* Explanatory Rules card */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">하네스의 규칙서 적용 메커니즘</h4>
                  
                  <div className="space-y-4 text-xs leading-relaxed text-slate-600">
                    <div className="bg-slate-50 border-l-4 border-slate-400 p-3.5 rounded-r">
                      <h5 className="font-bold text-slate-800 mb-1">1. 시스템 프롬프트의 독립화</h5>
                      <p>비즈니스 수칙이나 제약 조건을 시스템 프롬프트에 하드코딩하지 않습니다. 대신 에이전트 구동 전 플랫 파일 형식의 <code className="bg-slate-200 px-1 py-0.5 rounded">AGENTS.md</code>를 동적으로 임포트함으로써 동작의 한계와 규칙을 실시간 주입하고 조종합니다.</p>
                    </div>

                    <div className="bg-slate-50 border-l-4 border-slate-400 p-3.5 rounded-r">
                      <h5 className="font-bold text-slate-800 mb-1">2. 행동 억제 게이트</h5>
                      <p>계획 단계 수립 후, 사전에 약속된 <code className="bg-slate-200 px-1 py-0.5 rounded">spec.md</code> 명세서가 하네스의 승인 마일스톤(모호성 스코어 충족)을 획득하기 전까지는 실제 소스코드 파일 및 산출물을 쓸 수 있는 물리 파일 시스템 쓰기 권한을 원천 상실시킵니다.</p>
                    </div>

                    <div className="bg-slate-50 border-l-4 border-slate-400 p-3.5 rounded-r">
                      <h5 className="font-bold text-slate-800 mb-1">3. 삼각 격리 topology</h5>
                      <p>거시 설계자, 국소 장인, 냉혹 검열관의 역할을 분할함으로써 서로의 중간 상태를 직접 참조하지 않고 오직 파일 시스템의 폴더 상태 변화에 맞춰 변증법적 피드백(정반합)을 형성하게 강제합니다.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                  <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                    <Terminal className="w-4 h-4" />
                    <span>harness.config.json</span>
                  </div>
                  <pre>{`{
  "workflowType": "${state.currentWorkflow}",
  "ambiguityThreshold": ${state.ambiguityThreshold},
  "maxIterations": ${state.maxIterations},
  "jurySize": 3,
  "strictMode": true
}`}</pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GLOBAL CLI GUIDE */}
        {activeTab === "cli" && (
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2">
                  <Code className="w-5 h-5 text-slate-500" />
                  전역 CLI 설치 및 사용설명서
                </h3>
                <p className="text-xs text-slate-500">본 프로젝트를 깃허브에 올린 후 클론해서 전역 설치하고 어떤 프로젝트 폴더에서든 하네스를 적용해 보세요.</p>
              </div>
              <span className="text-xs bg-slate-100 border border-slate-200 font-mono px-2 py-0.5 rounded text-slate-600">npm install -g .</span>
            </div>

            <div className="space-y-6">
              
              {/* CLI Command 1: Install */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">1. 글로벌 설치 방법</h4>
                <p className="text-xs text-slate-500 mb-3">본 레포지토리를 클론한 뒤, 루트 경로에서 다음 명령을 실행하여 전역 CLI를 심볼릭 링크 형태로 링크 또는 글로벌 설치합니다.</p>
                
                <div className="relative bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs">
                  <button
                    onClick={() => copyToClipboard("git clone <repo-url>\ncd opencode-harness\nnpm install\nnpm run build\nnpm install -g .", "cli-install")}
                    className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedText === "cli-install" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre>{`# 1. 깃허브에서 클론 진행
$ git clone https://github.com/your-username/opencode-harness.git
$ cd opencode-harness

# 2. 의존성 설치 및 에이전트 빌드 진행
$ npm install
$ npm run build

# 3. 글로벌 npm 패키지로 현재 폴더를 설치 등록
$ npm install -g .`}</pre>
                </div>
              </div>

              {/* CLI Command 2: Usage */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">2. 로컬 프로젝트마다 초기화하기</h4>
                <p className="text-xs text-slate-500 mb-3">하네스를 적용할 특정 프로젝트 폴더로 이동한 후, 초기화 명령어를 실행하여 3대 가상 상태 폴더와 AGENTS.md 수칙 매뉴얼을 이식받습니다.</p>
                
                <div className="relative bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs">
                  <button
                    onClick={() => copyToClipboard("cd ~/my-new-project\nopencode-harness init\nopencode-harness status", "cli-init")}
                    className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedText === "cli-init" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre>{`# 하네스를 적용할 프로젝트 폴더로 이동
$ cd ~/my-new-project

# 하네스 가상 상태 노드(tasks/, review/, done/) 및 AGENTS.md 초기 이식 진행
$ opencode-harness init

# 하네스 무결성 검사 및 파일 현황 모니터링
$ opencode-harness status`}</pre>
                </div>
              </div>

              {/* CLI Command 3: Execution */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2">3. 에이전트 오케스트레이션 실행하기</h4>
                <p className="text-xs text-slate-500 mb-3">설정된 제약과 규칙에 맞춰 계획-실행-비평 자율 상태 전이 루프를 개시합니다.</p>
                
                <div className="relative bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs">
                  <button
                    onClick={() => copyToClipboard("export GEMINI_API_KEY=\"your_key_here\"\nopencode-harness run --workflow PROJECT_CODING --threshold 0.3", "cli-run")}
                    className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedText === "cli-run" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <pre>{`# Gemini API API 키 환경변수 셋팅
$ export GEMINI_API_KEY="AI_STUDIO_API_KEY_HERE"

# 하네스 오케스트레이션 가동 (옵션 지정 가능)
$ opencode-harness run --workflow PROJECT_CODING --threshold 0.3`}</pre>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Floating Panel: Interactive File Content Reader */}
      <AnimatePresence>
        {state.selectedFileContent && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-[800px] max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold tracking-tight">{state.selectedFileContent.path}</span>
                </div>
                <button
                  onClick={() => setState((prev) => ({ ...prev, selectedFileContent: null }))}
                  className="text-slate-400 hover:text-white transition-colors text-xs font-bold border border-slate-700 px-2 py-1 rounded"
                >
                  닫기
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto bg-slate-50">
                <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed select-text p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                  {state.selectedFileContent.content}
                </pre>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                <span>Secure sandbox read-only view</span>
                <button
                  onClick={() => copyToClipboard(state.selectedFileContent?.content || "", "modal-copy")}
                  className="flex items-center space-x-1 hover:text-slate-800 border border-slate-200 bg-white px-2.5 py-1 rounded shadow-xs"
                >
                  {copiedText === "modal-copy" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 font-bold">복사됨!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>내용 복사</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Aesthetic Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400 font-mono">
        &copy; 2026 Opencode Agent Harness. Hashed & Compliant under EU AI Act & CA Transparency Act directives.
      </footer>
    </div>
  );
}
