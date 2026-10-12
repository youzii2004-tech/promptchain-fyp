import { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import { 
  Play, Sparkles, Code2, Braces, TerminalSquare, Loader2, Activity, Save, 
  CheckSquare, Square, History, Database, BookOpen, Wand2, TrendingUp, 
  CheckCircle2, ArrowRight, Copy, Check
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from 'recharts';
import PEEMRadarChart from './RadarChartComponent';
import DatasetUploader from './components/DatasetUploader';
import { BatchSummaryStats } from './components/BatchSummaryStats';
import BatchResultsTable from './components/BatchResultsTable';
import FlowCanvas from './components/FlowCanvas';
import ExportModal from './components/ExportModal';
import OptimizeButton from './components/OptimizeButton';
import OptimizationLoopPanel from './components/OptimizationLoopPanel';
import TemplateLibrary from './components/TemplateLibrary';
import { usePromptStore } from './store/usePromptStore';
import './App.css';

const AVAILABLE_MODELS = [
  { id: 'llama-70b', label: 'GPT-OSS 120B (Groq)', short: 'GPT-OSS 120B' },
  { id: 'llama-8b', label: 'GPT-OSS 20B (Groq)', short: 'GPT-OSS 20B' },
  { id: 'nemotron-120b', label: 'Nemotron 3 Super 120B (OpenRouter)', short: 'Nemotron 120B' },
  { id: 'ollama-llama3.1', label: 'Llama 3.1 8B (Local Ollama)', short: 'Ollama 3.1' }
];

// Ollama runs on the *backend's* localhost, not the visitor's browser - so it
// can only ever work when the API itself is running locally too (dev setup).
// Against the deployed Render backend it will 100% error every time, so hide
// it there instead of offering a model that can never succeed.
const apiBase = import.meta.env.VITE_API_BASE_URL || '';
const IS_LOCAL_BACKEND = apiBase.includes('localhost') || apiBase.includes('127.0.0.1');
const SELECTABLE_MODELS = IS_LOCAL_BACKEND
  ? AVAILABLE_MODELS
  : AVAILABLE_MODELS.filter(m => !m.id.startsWith('ollama-'));

// Monaco measures its container once at mount; if that happens before the
// surrounding flex/percentage-height layout has settled (e.g. while the
// Google Fonts @import in App.css is still resolving), it locks in a
// near-zero size and automaticLayout's ResizeObserver never fires again
// since the container's real size was already stable by the time it's
// observed. Forcing an explicit layout() a beat after mount fixes it.
const forceMonacoLayout = (editor: any) => {
  requestAnimationFrame(() => requestAnimationFrame(() => editor.layout()));
  setTimeout(() => editor.layout(), 300);
};

const SIMPLE_TEMPLATES = [
  {
    id: 'creative',
    title: '✍️ Creative Refiner',
    description: 'Polishes articles or creative drafts to make them engaging and punchy.',
    prompt: `You are an elite developmental editor. Refine the draft below. Focus on enhancing sentence variety, pacing, and visual storytelling, while preserving the author's unique voice. Keep the final output under 500 words.

# Original Draft
[Enter your text here]`
  },
  {
    id: 'debugger',
    title: '🐛 Code Solver & Fixer',
    description: 'Identifies bugs, explains core issues, and writes clean, optimal fixes.',
    prompt: `You are a staff software engineer. Analyze the code provided. Identify any logic bugs, memory leaks, performance bottlenecks, or security issues. Explain the issues clearly and provide a production-ready, refactored solution with proper error handling.

# Code To Review
[Enter your code here]`
  },
  {
    id: 'synthesizer',
    title: '🔎 Smart Synthesizer',
    description: 'Summarizes deep research papers or reports into actionable summaries.',
    prompt: `You are a lead quantitative researcher. Synthesize the text below into an executive summary. Extract the top 3 critical insights, any key numerical figures or metrics, and a section on actionable next steps.

# Source Text
[Enter your source text here]`
  },
  {
    id: 'copywriter',
    title: '🚀 Persuasive Copywriter',
    description: 'Generates high-converting marketing copy or email campaigns.',
    prompt: `You are a world-class direct-response copywriter. Craft an extremely persuasive email campaign promoting a software product. Focus on a high-benefit hook, establish deep empathy with the pain point, and build a frictionless call-to-action.

# Product Details
[Enter product details here]`
  }
];

function App() {
  const promptCode = usePromptStore(state => state.promptCode);
  const setPromptCode = usePromptStore(state => state.setPromptCode);
  const schemaCode = usePromptStore(state => state.schemaCode);
  const setSchemaCode = usePromptStore(state => state.setSchemaCode);
  const selectedModels = usePromptStore(state => state.selectedModels);
  const setSelectedModels = usePromptStore(state => state.setSelectedModels);
  const results = usePromptStore(state => state.results);
  const history = usePromptStore(state => state.history);
  const activeTab = usePromptStore(state => state.activeTab);
  const setActiveTab = usePromptStore(state => state.setActiveTab);
  
  const isRunning = usePromptStore(state => state.isRunning);
  const isSaving = usePromptStore(state => state.isSaving);
  const isOptimizing = usePromptStore(state => state.isOptimizing);
  const isBatching = usePromptStore(state => state.isBatching);
  const batchResults = usePromptStore(state => state.batchResults);

  const isLooping = usePromptStore(state => state.isLooping);
  const loopResult = usePromptStore(state => state.loopResult);
  const runOptimizationLoop = usePromptStore(state => state.runOptimizationLoop);

  const runPrompt = usePromptStore(state => state.runPrompt);
  const evaluatePEEM = usePromptStore(state => state.evaluatePEEM);
  const saveVersion = usePromptStore(state => state.saveVersion);
  const optimizePrompt = usePromptStore(state => state.optimizePrompt);
  const batchUpload = usePromptStore(state => state.batchUpload);
  const fetchHistory = usePromptStore(state => state.fetchHistory);

  // isSimpleMode has been deprecated to focus purely on Pro IDE functionality.
  const isSimpleMode = false;
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Simple Mode state for single-shot prompt enhancement
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // UI Local State for Modals
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSnippets, setExportSnippets] = useState({ python: '', nextjs: '', curl: '' });

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleExport = useCallback(async () => {
    try {
      let parsedSchema = null;
      try { parsedSchema = JSON.parse(schemaCode); } catch (e) {}
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptCode,
          model: selectedModels[0] || 'llama-70b',
          json_schema: parsedSchema
        })
      });

      if (response.ok) {
        const data = await response.json();
        setExportSnippets(data);
        setIsExportModalOpen(true);
      }
    } catch (e) {
      console.error("Export failed", e);
    }
  }, [promptCode, schemaCode, selectedModels]);

  const isAnyEvaluating = useMemo(() => 
    Object.values(results).some((r: any) => r.isEvaluating), 
  [results]);

  const getModelName = (id: string) => AVAILABLE_MODELS.find(m => m.id === id)?.label || id;

  // Active simple mode prompt scores and outputs
  const simpleActiveModel = selectedModels[0] || 'llama-70b';
  const simpleResult = results[simpleActiveModel];
  const peemData = simpleResult?.peemData;
  const overallScore = peemData?.overall_score || 0;

  // Check if LLM run has successfully returned output
  const hasOutput = useMemo(() => {
    return simpleResult && simpleResult.output && !simpleResult.output.startsWith('//');
  }, [simpleResult]);

  const scoreInfo = useMemo(() => {
    if (overallScore >= 80) return { label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (overallScore >= 60) return { label: 'Good', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    if (overallScore > 0) return { label: 'Needs Polish', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    return { label: 'Not Rated', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
  }, [overallScore]);



  // Comparison bar chart for baseline vs optimized
  const optimizationComparisonData = useMemo(() => {
    if (!loopResult || !loopResult.history || loopResult.history.length < 2) return [];
    const baselineEval = loopResult.history[0].chosen.evaluation;
    const optimizedEval = loopResult.history[loopResult.history.length - 1].chosen.evaluation;

    return Object.keys(baselineEval)
      .filter(axis => axis !== 'overall_score')
      .map(axis => ({
        name: axis.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        Baseline: (baselineEval[axis]?.score || 0) * 10,
        Optimized: (optimizedEval[axis]?.score || 0) * 10
      }));
  }, [loopResult]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const simpleOptimize = async () => {
    // Run simplified 3-iteration, beam-width-2 loop optimized for normal users
    await runOptimizationLoop(3, 2);
  };

  // Single-shot optimizer execution. Takes the model whose PEEM evaluation
  // should drive the rewrite - defaults to the Simple Mode active model, but
  // the Pro Mode per-model PEEM card passes its own modelId explicitly so
  // enhancing model B's result doesn't silently use model A's evaluation
  // (or fail entirely if model A hasn't been PEEM-scored yet).
  const handleEnhancePrompt = async (modelId: string = simpleActiveModel) => {
    const targetPeemData = results[modelId]?.peemData;
    if (!targetPeemData) {
      toast.error("Please evaluate the PEEM Score first so the optimizer knows what to fix.");
      return;
    }
    setIsEnhancing(true);
    setEnhancedPrompt(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptCode, peem_evaluation: targetPeemData })
      });
      
      if (!response.ok) throw new Error("Prompt enhancement failed.");
      const data = await response.json();
      setEnhancedPrompt(data.optimized_prompt);
      toast.success("AI Prompt Enhancement generated successfully!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div className="app-container min-h-screen bg-[#07090f] text-slate-100 font-sans flex flex-col antialiased">
      <Toaster position="top-right" />
      
      {/* Dynamic Inline CSS for smooth circular progress, animations and scrollbar tweaks */}
      <style>{`
        .circular-progress {
          transition: stroke-dashoffset 0.8s ease-in-out;
        }
        @keyframes pulse-glowing {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 4px rgba(99, 102, 241, 0.2)); }
          50% { transform: scale(1.03); filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.5)); }
        }
        .pulse-accent-glowing {
          animation: pulse-glowing 2.5s infinite ease-in-out;
        }
        .editor-height-simple {
          height: 380px;
        }
        @media (max-width: 1024px) {
          .editor-height-simple {
            height: 280px;
          }
        }
      `}</style>

      {/* Modern Header - Exact original logo structure & CSS classes used for branding compliance */}
      <header className="app-header h-16 shrink-0 bg-slate-950/70 border-b border-slate-900/80 px-4 md:px-8 flex items-center justify-between backdrop-blur-md z-30 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="logo-section">
            <Sparkles className="logo-icon animate-pulse" size={22} />
            PromptChain <span className="badge">IDE Toolkit</span>
          </div>
        </div>

        {/* Control Button Suite */}
        <div className="flex items-center gap-2 md:gap-3">
          {!isSimpleMode && (
            <div className="flex items-center gap-2 max-md:hidden">
              <OptimizeButton onClick={optimizePrompt} isOptimizing={isOptimizing} />
              <button className="btn outline-btn text-xs font-medium border-slate-800 hover:bg-slate-900/50" onClick={handleExport}>
                <Code2 size={14} /> Export
              </button>
              <button className="btn outline-btn text-xs font-medium border-slate-800 hover:bg-slate-900/50" onClick={saveVersion} disabled={isSaving}>
                {isSaving ? <Loader2 size={14} className="spinner" /> : <Save size={14} />}
                <span>Save</span>
              </button>
              <button className="btn secondary-btn text-xs font-medium hover:scale-[1.01]" onClick={evaluatePEEM} disabled={isAnyEvaluating || isRunning}>
                <Activity size={14} /> PEEM Score
              </button>
            </div>
          )}

          <button
            className="btn primary-btn text-xs font-semibold bg-indigo-600 border-indigo-500 hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99] shadow-indigo-600/15" 
            onClick={runPrompt} 
            disabled={isRunning}
          >
            {isRunning ? <Loader2 size={14} className="spinner" /> : <Play size={14} />} 
            <span>{isRunning ? 'Running...' : 'Run Prompt'}</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Workspace - Flex layouts with scroll controls matching original classes */}
      <main className="app-content flex-1 flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-64px)] overflow-y-auto lg:overflow-hidden p-4 md:p-5 lg:p-6 gap-6">
        
        {/* ========================================================================= */}
        {/* SIMPLE MODE VIEW: Super friendly, aesthetic layout with rich graphics     */}
        {/* ========================================================================= */}
        {isSimpleMode ? (
          <div className="w-full h-full flex flex-col lg:flex-row gap-6 lg:overflow-hidden">
            
            {/* LEFT COLUMN: Scrollable panel containing Editor & Quick Scenarios */}
            <section className="panel editor-panel w-full lg:w-[42%] shrink-0 h-auto lg:h-full flex flex-col overflow-y-auto scrollbar-thin p-5 gap-5 border border-slate-900 bg-[#0b0e17]/80 rounded-2xl shadow-xl">
              <div className="bg-[#07090f]/50 rounded-xl border border-slate-900/60 overflow-hidden flex flex-col shrink-0">
                <div className="border-b border-slate-900/80 px-4 py-3 flex items-center justify-between bg-slate-950/25">
                  <div className="flex items-center gap-2 font-semibold text-xs tracking-tight text-slate-300">
                    <Code2 className="text-indigo-400" size={14} />
                    <span>Your Prompt Draft</span>
                  </div>
                  {/* Active model tag */}
                  <div className="text-[10px] font-medium bg-slate-900 px-2.5 py-0.5 rounded-md text-slate-400 border border-slate-800">
                    Target: {AVAILABLE_MODELS.find(m => m.id === selectedModels[0])?.short || 'GPT-OSS 120B'}
                  </div>
                </div>

                {/* Monaco Editor wrapped in fixed dimension box */}
                <div className="editor-height-simple w-full relative">
                  <Editor
                    height="100%"
                    defaultLanguage="markdown"
                    theme="vs-dark"
                    onMount={forceMonacoLayout}
                    value={promptCode}
                    onChange={(val) => {
                      setPromptCode(val || '');
                      setEnhancedPrompt(null); // Clear enhanced prompt when baseline is modified
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', monospace",
                      lineHeight: 1.6,
                      padding: { top: 16 },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>

              {/* CURATED SCENARIOS (Quick starts) */}
              <div className="flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 uppercase tracking-wider select-none px-1">
                  <BookOpen size={13} />
                  <span>Curated Quick-Start Scenarios</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SIMPLE_TEMPLATES.map(tmpl => (
                    <button
                      key={tmpl.id}
                      onClick={() => {
                        setPromptCode(tmpl.prompt);
                        setEnhancedPrompt(null);
                        setSelectedModels(['llama-70b']); // Default to our main high-tier model
                      }}
                      className="group p-4 rounded-xl bg-[#07090f]/40 border border-slate-900 hover:border-indigo-500/20 text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-between hover:bg-indigo-500/[0.01] shadow-sm hover:shadow-indigo-500/5 cursor-pointer"
                    >
                      <div>
                        <h4 className="font-semibold text-slate-200 group-hover:text-indigo-400 text-sm transition-colors mb-1">
                          {tmpl.title}
                        </h4>
                        <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2">
                          {tmpl.description}
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center text-[10px] text-indigo-500 font-bold tracking-tight opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
                        <span>Load Prompt</span>
                        <ArrowRight size={10} className="transform group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: Visual Report Workspace with Scroll Container */}
            <section className="panel preview-panel flex-1 h-auto lg:h-full flex flex-col bg-[#0b0e17]/80 rounded-2xl border border-slate-900 shadow-2xl overflow-hidden">
              <div className="border-b border-slate-900 px-6 py-4 flex items-center justify-between bg-slate-950/45 shrink-0">
                <div className="flex items-center gap-2 font-semibold text-sm tracking-tight text-slate-200">
                  <TrendingUp className="text-indigo-400" size={16} />
                  <span>Visual Performance & Refinement Report</span>
                </div>
                {/* One click scoring & optimizing buttons for simple mode */}
                {overallScore > 0 && !isLooping && (
                  <button
                    onClick={simpleOptimize}
                    className="pulse-accent-glowing px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-500 active:scale-[0.98] transition-all cursor-pointer border border-indigo-500"
                  >
                    <Wand2 size={13} />
                    <span>Auto-Optimize Prompt</span>
                  </button>
                )}
                {overallScore === 0 && hasOutput && !isRunning && !isLooping && (
                  <button
                    onClick={evaluatePEEM}
                    disabled={isAnyEvaluating}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer border border-emerald-500 shadow-md"
                  >
                    <Activity size={13} />
                    <span>Evaluate PEEM Score</span>
                  </button>
                )}
              </div>

              {/* Scrollable Visual Workspace with State Machine for Layout rendering */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                
                {/* STATE 1: MULTI-ROUND OPTIMIZATION LOOP ACTIVE */}
                {isLooping && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[350px] bg-[#07090f]/20 rounded-2xl border border-indigo-500/10 p-8 text-center gap-6 animate-pulse">
                    <div className="relative flex items-center justify-center w-20 h-20">
                      <Loader2 size={44} className="text-indigo-400 animate-spin" />
                      <Wand2 size={20} className="text-purple-400 absolute" />
                    </div>
                    <div className="max-w-md">
                      <h4 className="font-bold text-slate-200 mb-2 text-base">Beam-Search Multi-Round Optimization Active</h4>
                      <p className="text-slate-400 text-xs leading-relaxed mb-4">
                        The judge-in-the-loop optimizer is generating candidate rewrites, grading them on all 9 axes, and selecting the champion prompt.
                      </p>
                      
                      {/* Interactive Visual Progress Timeline */}
                      <div className="flex flex-col gap-2.5 bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-left">
                        <div className="flex items-center gap-2.5 text-xs">
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">1</div>
                          <span className="font-medium text-slate-300">Run baseline prompt and evaluate</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs">
                          <div className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">2</div>
                          <span className="font-medium text-slate-300">Generate beam candidate rewrites in parallel</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-xs animate-pulse">
                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] animate-bounce">3</div>
                          <span className="font-semibold text-indigo-400">9-axis grading & elitist selection in progress...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STATE 2: OPTIMIZATION RESULTS FULLY LOADED */}
                {!isLooping && loopResult && (
                  <div className="flex flex-col gap-6">
                    <div className="p-5 rounded-2xl bg-[#07090f]/40 border border-slate-900">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-200 text-sm">Optimization Iteration Progression</h4>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          Score Improved: {loopResult.baseline_score} ➡️ {loopResult.best_score} (+{loopResult.best_score - loopResult.baseline_score})
                        </span>
                      </div>
                      <div className="h-52 w-full text-slate-300">
                        {/* Line Progression Chart */}
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={loopResult.history.map((r: any) => ({ name: `Round ${r.iteration}`, Score: r.chosen.overall_score }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0d111c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                            <Bar dataKey="Score" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={45} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Axis-by-Axis Before/After Comparison Chart */}
                    <div className="p-5 rounded-2xl bg-[#07090f]/40 border border-slate-900">
                      <h4 className="font-bold text-slate-200 text-sm mb-4">Axis-by-Axis Quality Gain Comparison</h4>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={optimizationComparisonData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0d111c', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Bar dataKey="Baseline" fill="#475569" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Optimized" fill="#818cf8" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* SIDE BY SIDE ORIGINAL VS OPTIMIZED DECK */}
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm mb-3">Before vs. After Comparison</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Original */}
                        <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Original Prompt (Baseline)</span>
                            <pre className="text-[11px] font-mono text-slate-400 bg-slate-950/65 p-3 rounded-lg border border-slate-900 overflow-x-auto whitespace-pre-wrap max-h-48 scrollbar-thin">
                              {loopResult.history[0]?.chosen?.prompt}
                            </pre>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-slate-900 pt-3 text-xs text-slate-400">
                            <span>Score: <b>{loopResult.baseline_score}</b></span>
                          </div>
                        </div>
                        {/* Optimized */}
                        <div className="p-4 rounded-xl bg-indigo-950/[0.08] border border-indigo-500/10 flex flex-col justify-between shadow-lg shadow-indigo-500/[0.01]">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Optimized Prompt (Champion)</span>
                              <span className="text-[9px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">WINNER</span>
                            </div>
                            <pre className="text-[11px] font-mono text-slate-200 bg-indigo-950/20 p-3 rounded-lg border border-indigo-500/10 overflow-x-auto whitespace-pre-wrap max-h-48 scrollbar-thin">
                              {loopResult.best_prompt}
                            </pre>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-indigo-500/10 pt-3 text-xs">
                            <span className="text-slate-300">Score: <b className="text-indigo-400">{loopResult.best_score}</b></span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => copyToClipboard(loopResult.best_prompt, 'optimized_prompt_copy')}
                                className="p-1 px-2.5 rounded bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/30 transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                {copiedIndex === 'optimized_prompt_copy' ? <Check size={11} /> : <Copy size={11} />}
                                <span>{copiedIndex === 'optimized_prompt_copy' ? 'Copied!' : 'Copy'}</span>
                              </button>
                              <button
                                onClick={() => setPromptCode(loopResult.best_prompt)}
                                className="p-1 px-2.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                              >
                                <CheckCircle2 size={11} />
                                <span>Load Editor</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STATE 3: RUN PROMPT ACTIVE SKELETON */}
                {isRunning && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-center gap-4 bg-[#07090f]/20 rounded-2xl border border-slate-900/50 p-8 animate-pulse">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                    <div>
                      <h4 className="font-bold text-slate-200 mb-1">Running Prompt...</h4>
                      <p className="text-slate-400 text-xs">Executing your prompt template against active LLMs. Please wait.</p>
                    </div>
                  </div>
                )}

                {/* STATE 4: EVALUATION IN PROGRESS SKELETON */}
                {isAnyEvaluating && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-center gap-4 bg-[#07090f]/20 rounded-2xl border border-slate-900/50 p-8 animate-pulse">
                    <Loader2 size={32} className="text-emerald-500 animate-spin" />
                    <div>
                      <h4 className="font-bold text-slate-200 mb-1">AI Evaluator Working...</h4>
                      <p className="text-slate-400 text-xs">Checking outputs against 9-Axis PEEM Protocol parameters.</p>
                    </div>
                  </div>
                )}

                {/* STATE 5: EVALUATION SCORE REVEAL (PEEM score loaded!) */}
                {!isLooping && !isRunning && !isAnyEvaluating && peemData && overallScore > 0 && (
                  <div className="flex flex-col gap-6">
                    
                    {/* TOP STATS & VISUAL PEEM RADAR CHART DECK */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-950/20 p-5 rounded-2xl border border-slate-900/80">
                      
                      {/* Overall Score Circle Gauge */}
                      <div className="md:col-span-4 flex flex-col items-center justify-center text-center relative border-r border-slate-900/50 max-md:border-r-0 max-md:border-b max-md:pb-5">
                        <div className="relative w-28 h-28 mb-3 select-none">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="56" cy="56" r="48" className="stroke-slate-900" strokeWidth="6" fill="transparent" />
                            <circle cx="56" cy="56" r="48" className="stroke-indigo-500 circular-progress" strokeWidth="7" fill="transparent" strokeDasharray="301.6" strokeDashoffset={301.6 - (301.6 * overallScore) / 100} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-slate-100">{overallScore}</span>
                            <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400">SCORE</span>
                          </div>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${scoreInfo.color}`}>{scoreInfo.label}</span>
                      </div>

                      {/* SIGNATURE PEEM RADAR CHART - Fully Visible Visual Axis Mapping */}
                      <div className="md:col-span-8 h-64 relative bg-slate-950/10 rounded-xl overflow-hidden p-1">
                        <PEEMRadarChart data={peemData} />
                      </div>
                    </div>

                    {/* PROMPT ENHANCEMENT STUDIO CARD - The core project responsibility of providing optimized prompts */}
                    <div className="p-6 rounded-2xl bg-indigo-950/[0.04] border border-indigo-500/10 flex flex-col gap-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-indigo-500/10 pb-3">
                        <div className="flex items-center gap-2">
                          <Wand2 className="text-indigo-400" size={18} />
                          <h4 className="font-bold text-sm text-slate-100">AI Prompt Enhancement Studio</h4>
                        </div>
                        <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/15">
                          REWRITE ENGINE
                        </span>
                      </div>

                      {isEnhancing ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-3 text-center animate-pulse">
                          <Loader2 size={28} className="text-indigo-500 animate-spin" />
                          <p className="text-xs text-slate-400 font-medium">Analyzing PEEM score vulnerabilities and drafting enhanced candidate...</p>
                        </div>
                      ) : enhancedPrompt ? (
                        /* Side-by-Side original vs single-shot enhanced prompt comparison */
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-[#07090f]/50 border border-slate-900 flex flex-col justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Original Prompt</span>
                                <pre className="text-[11px] font-mono text-slate-400 bg-slate-950/80 p-3 rounded-lg border border-slate-900 overflow-x-auto whitespace-pre-wrap max-h-40 scrollbar-thin">
                                  {promptCode}
                                </pre>
                              </div>
                              <div className="mt-3 flex items-center justify-between border-t border-slate-900 pt-3 text-xs text-slate-400">
                                <span>PEEM Rating: <b>{overallScore}/100</b></span>
                              </div>
                            </div>

                            <div className="p-4 rounded-xl bg-indigo-950/10 border border-indigo-500/20 flex flex-col justify-between shadow-inner">
                              <div>
                                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block mb-2">Enhanced Optimized Prompt</span>
                                <pre className="text-[11px] font-mono text-slate-200 bg-slate-950/80 p-3 rounded-lg border border-indigo-500/10 overflow-x-auto whitespace-pre-wrap max-h-40 scrollbar-thin">
                                  {enhancedPrompt}
                                </pre>
                              </div>
                              <div className="mt-3 flex items-center justify-between border-t border-indigo-500/10 pt-3 text-xs">
                                <span className="text-indigo-400 font-bold">Significantly Upgraded</span>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => copyToClipboard(enhancedPrompt, 'simple_enhanced_copy')}
                                    className="p-1 px-2.5 rounded bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/30 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    {copiedIndex === 'simple_enhanced_copy' ? <Check size={11} /> : <Copy size={11} />}
                                    <span>{copiedIndex === 'simple_enhanced_copy' ? 'Copied!' : 'Copy'}</span>
                                  </button>
                                  <button
                                    onClick={() => setPromptCode(enhancedPrompt)}
                                    className="p-1 px-2.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1 cursor-pointer font-semibold"
                                  >
                                    <CheckCircle2 size={11} />
                                    <span>Load Editor</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 bg-slate-950/50 rounded-xl border border-slate-900 text-center gap-4">
                          <p className="text-slate-400 text-xs leading-relaxed max-w-md">
                            Our rewrite engine parses the PEEM axis feedback to inject robust edge case triggers, constrain factual parameters, and clarify logical instructions in your prompt.
                          </p>
                          <button
                            onClick={() => handleEnhancePrompt()}
                            className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98] text-xs font-semibold flex items-center gap-1.5 border border-indigo-500 transition-all cursor-pointer shadow-lg"
                          >
                            <Wand2 size={13} />
                            <span>Enhance Prompt Now</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Detailed Axis Breakdown Table */}
                    <div className="flex flex-col gap-2">
                      <h4 className="font-bold text-slate-200 text-sm px-1 mb-1">Axis Strengths & Weaknesses Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(peemData)
                          .filter(([axis]) => axis !== 'overall_score')
                          .map(([axis, val]: [string, any]) => {
                            const isStrong = val.score >= 8;
                            const isWeak = val.score < 6;
                            return (
                              <div 
                                key={axis} 
                                className={`p-4 rounded-xl border flex flex-col justify-between ${isStrong ? 'bg-emerald-500/[0.015] border-emerald-500/10' : isWeak ? 'bg-rose-500/[0.015] border-rose-500/10' : 'bg-slate-950/20 border-slate-900'}`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-semibold text-xs text-slate-200 capitalize">{axis.replace(/_/g, ' ')}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isStrong ? 'bg-emerald-500/10 text-emerald-400' : isWeak ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-900 text-slate-400'}`}>
                                    {val.score}/10
                                  </span>
                                </div>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                  {val.reasoning}
                                </p>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* LLM RAW OUTPUT */}
                    <div className="p-5 rounded-2xl bg-[#07090f]/40 border border-slate-900 flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3 shrink-0">
                        <span className="font-semibold text-xs text-slate-300 block">LLM Execution Output</span>
                        <button
                          onClick={() => copyToClipboard(simpleResult?.output || '', 'llm_output_copy')}
                          className="p-1 px-2.5 rounded bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer text-xs"
                        >
                          {copiedIndex === 'llm_output_copy' ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedIndex === 'llm_output_copy' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto scrollbar-thin leading-relaxed">
                        {simpleResult?.output}
                      </pre>
                    </div>

                  </div>
                )}

                {/* STATE 6: LLM OUTPUT COMPLETED BUT PEEM NOT YET RATED */}
                {!isLooping && !isRunning && !isAnyEvaluating && !loopResult && hasOutput && overallScore === 0 && (
                  <div className="flex flex-col gap-6">
                    
                    {/* Floating Call to Action to Evaluate */}
                    <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/25 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                          <Sparkles size={12} />
                          <span>Unlock Automated Enhancement</span>
                        </div>
                        <h4 className="font-bold text-slate-100 text-sm mb-1">Rate Prompt Performance with PEEM</h4>
                        <p className="text-slate-300 text-xs leading-relaxed max-w-lg">
                          Run a pedagogical evaluation on all 9 axes (Clarity, Factuality, Reasoning depth) to see exactly how your prompt performs, check strengths, and unlock one-click optimization rewrites.
                        </p>
                      </div>
                      <button
                        onClick={evaluatePEEM}
                        className="pulse-accent-glowing shrink-0 px-5 py-2.5 rounded-xl bg-emerald-600 border border-emerald-500 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg"
                      >
                        <Activity size={14} />
                        <span>Run 9-Axis AI Evaluation</span>
                      </button>
                    </div>

                    {/* LLM RAW OUTPUT PANEL */}
                    <div className="p-5 rounded-2xl bg-[#07090f]/40 border border-slate-900 flex flex-col">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-3 shrink-0">
                        <span className="font-semibold text-xs text-slate-300 block">LLM Response Content</span>
                        <button
                          onClick={() => copyToClipboard(simpleResult?.output || '', 'llm_output_copy_raw')}
                          className="p-1 px-2.5 rounded bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer text-xs"
                        >
                          {copiedIndex === 'llm_output_copy_raw' ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedIndex === 'llm_output_copy_raw' ? 'Copied!' : 'Copy'}</span>
                        </button>
                      </div>
                      <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap max-h-96 overflow-y-auto scrollbar-thin leading-relaxed">
                        {simpleResult?.output}
                      </pre>
                    </div>
                  </div>
                )}

                {/* STATE 7: INITIAL PRISTINE EMPTY STATE (No output, no scores) */}
                {!isLooping && !isRunning && !isAnyEvaluating && !loopResult && !hasOutput && overallScore === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-center gap-5 bg-[#07090f]/20 rounded-2xl border border-slate-900/50 p-8">
                    <div className="w-14 h-14 rounded-full bg-slate-900/80 border border-slate-800 flex items-center justify-center text-indigo-500 shadow-lg">
                      <Sparkles size={28} />
                    </div>
                    <div className="max-w-md">
                      <h4 className="font-bold text-slate-100 mb-1.5 text-base">Draft & Test Your Prompts Visually</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        Get started by drafting your prompt on the left, or load one of our <b>Curated Scenarios</b>. Then, click the pulsing <b>Run Prompt</b> button in the top right to start!
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </section>
          </div>
        ) : (
          /* ========================================================================= */
          /* PRO MODE / EXPERT MODE VIEW: Full technical IDE multi-tab structure       */
          /* ========================================================================= */
          <>
            {/* LEFT COLUMN: full height prompt editor */}
            <section className="panel editor-panel w-full lg:w-[42%] shrink-0 h-auto lg:h-full flex flex-col overflow-hidden bg-[#0b0e17]/80 rounded-2xl border border-slate-900 shadow-xl">
              <header className="panel-header border-b border-slate-900 px-5 py-3.5 flex items-center justify-between bg-slate-950/45 shrink-0">
                <div className="panel-title flex items-center gap-2 font-semibold text-sm tracking-tight text-slate-200">
                  <Code2 size={16} className="text-indigo-400" /> 
                  <span>Prompt Editor</span>
                </div>
                <div className="model-selector-row flex items-center gap-2.5 select-none text-[11px] font-medium text-slate-400">
                  {SELECTABLE_MODELS.map(model => (
                    <div 
                      key={model.id} 
                      className={`model-checkbox flex items-center gap-1 px-2.5 py-1 rounded-md border cursor-pointer transition-all duration-200 ${selectedModels.includes(model.id) ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400' : 'bg-slate-900 border-slate-800 hover:text-slate-200'}`}
                      onClick={() => {
                        setSelectedModels(prev => 
                          Array.isArray(prev) 
                            ? (prev.includes(model.id) ? prev.filter(id => id !== model.id) : [...prev, model.id])
                            : [model.id]
                        );
                      }}
                    >
                      {selectedModels.includes(model.id) ? <CheckSquare size={12} className="checkbox-icon checked" /> : <Square size={12} className="checkbox-icon" />}
                      <span>{model.short}</span>
                    </div>
                  ))}
                </div>
              </header>
              <div className="flex-1 w-full relative min-h-[300px]">
                <div style={{ position: 'absolute', inset: 0 }}>
                  <Editor
                    height="100%"
                    defaultLanguage="markdown"
                    theme="vs-dark"
                    onMount={forceMonacoLayout}
                    value={promptCode}
                    onChange={(val) => {
                      setPromptCode(val || '');
                      setEnhancedPrompt(null);
                    }}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                      lineHeight: 1.6,
                      padding: { top: 20 },
                      scrollBeyondLastLine: false,
                      wordWrap: 'on',
                      automaticLayout: true
                    }}
                  />
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: multi-tab advanced panel */}
            <section className="panel preview-panel flex-1 h-auto lg:h-full flex flex-col bg-[#0b0e17]/80 rounded-2xl border border-slate-900 shadow-xl overflow-hidden">
              <header className="panel-header tabbed-header border-b border-slate-900 bg-slate-950/45 shrink-0">
                <div className="tabs flex flex-wrap gap-1 p-2">
                  {[
                    { id: 'templates', label: 'Templates', icon: BookOpen },
                    { id: 'schema', label: 'Schema', icon: Braces },
                    { id: 'output', label: 'Output', icon: TerminalSquare },
                    { id: 'peem', label: 'PEEM', icon: Activity },
                    { id: 'loop', label: 'Optimize Loop', icon: Sparkles },
                    { id: 'batch', label: 'Batch', icon: Database },
                    { id: 'history', label: 'History', icon: History },
                    { id: 'visual', label: 'Visual', icon: Code2 }
                  ].map((tab) => (
                    <button 
                      key={tab.id}
                      className={`tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                      onClick={() => setActiveTab(tab.id as any)}
                    >
                      <tab.icon size={13} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </header>
              
              <div className="tab-content flex-1 overflow-y-auto min-h-[350px]">
                {activeTab === 'schema' && (
                  <div className="editor-container w-full h-full relative" style={{ minHeight: '350px' }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                      <Editor
                        height="100%"
                        defaultLanguage="json"
                        theme="vs-dark"
                        onMount={forceMonacoLayout}
                        value={schemaCode}
                        onChange={(val) => setSchemaCode(val || '')}
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', monospace",
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {activeTab === 'output' && (
                  <div className="outputs-grid p-6 flex flex-col gap-4">
                    {selectedModels.length === 0 ? (
                      <div className="empty-state py-12 text-center text-slate-500">Select models to run the prompt.</div>
                    ) : (
                      selectedModels.map(modelId => (
                        <div key={modelId} className="output-card bg-slate-950/40 border border-slate-900 p-4 rounded-xl flex flex-col">
                          <div className="output-card-header flex items-center justify-between border-b border-slate-900 pb-2.5 mb-3">
                            <span className="model-name font-semibold text-xs text-indigo-400">{getModelName(modelId)}</span>
                            {results[modelId]?.metrics && (
                              <span className="tokens-badge text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded-full">{results[modelId].metrics.usage?.total_tokens} tokens</span>
                            )}
                          </div>
                          <pre className="output-text font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                            {results[modelId]?.output}
                          </pre>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'peem' && (
                  <div className="peem-container p-6 flex flex-col gap-6">
                    {selectedModels.map(modelId => {
                      const data = results[modelId];
                      if (!data?.peemData && !data?.isEvaluating) {
                        return (
                          <div key={modelId} className="peem-result-card bg-slate-950/40 border border-slate-900 rounded-xl p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
                            <Activity size={32} className="text-slate-700 mb-3" />
                            <h4 className="font-bold text-sm text-slate-300 mb-1">No PEEM Data for {getModelName(modelId)}</h4>
                            <p className="text-xs text-slate-500 max-w-sm">Run a prompt and then click "PEEM Score" to evaluate its performance against the 9-Axis protocol.</p>
                          </div>
                        );
                      }

                      const overallScore: number | undefined = data.peemData?.overall_score;
                      const overallScoreClass = overallScore === undefined
                        ? 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                        : overallScore >= 80
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                          : overallScore >= 60
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                            : 'text-rose-400 bg-rose-500/10 border-rose-500/20';

                      return (
                        <div key={modelId} className="peem-result-card bg-slate-950/40 border border-slate-900 rounded-xl p-5 flex flex-col">
                          <div className="peem-card-header border-b border-slate-900 pb-3 mb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <h4 className="font-bold text-sm text-slate-200">{getModelName(modelId)} PEEM Score</h4>
                              {overallScore !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${overallScoreClass}`}>
                                  {overallScore}/100
                                </span>
                              )}
                            </div>
                            {data.peemData && (
                              <button
                                onClick={() => handleEnhancePrompt(modelId)}
                                disabled={isEnhancing}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-500 transition-colors disabled:opacity-50 shrink-0"
                              >
                                {isEnhancing ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                                <span>{isEnhancing ? 'Enhancing...' : 'Enhance Prompt Now'}</span>
                              </button>
                            )}
                          </div>

                          {data.isEvaluating ? (
                            <div className="loading-peem flex flex-col items-center justify-center py-12 gap-3 text-center">
                              <Loader2 className="spinner text-indigo-500 animate-spin" size={32} />
                              <p className="text-xs text-slate-400">Agent is evaluating prompt performance...</p>
                            </div>
                          ) : data.peemData ? (
                            <>
                              {enhancedPrompt && (
                                <div className="mb-6 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Enhanced Optimized Prompt</span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => copyToClipboard(enhancedPrompt, 'simple_enhanced_copy')}
                                        className="p-1 px-2.5 rounded bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer text-xs"
                                      >
                                        {copiedIndex === 'simple_enhanced_copy' ? <Check size={11} /> : <Copy size={11} />}
                                        <span>{copiedIndex === 'simple_enhanced_copy' ? 'Copied!' : 'Copy'}</span>
                                      </button>
                                      <button
                                        onClick={() => { setPromptCode(enhancedPrompt); setActiveTab('output'); setEnhancedPrompt(null); }}
                                        className="p-1 px-2.5 rounded bg-indigo-600 text-white border border-indigo-500 hover:bg-indigo-500 transition-colors flex items-center gap-1 cursor-pointer text-xs"
                                      >
                                        <CheckCircle2 size={11} />
                                        <span>Use This Prompt</span>
                                      </button>
                                    </div>
                                  </div>
                                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {enhancedPrompt}
                                  </pre>
                                </div>
                              )}
                              <div className="peem-grid grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="peem-chart h-64 border border-slate-900 rounded-xl p-2 bg-slate-950/20">
                                  <PEEMRadarChart data={data.peemData} />
                                </div>
                                <div className="peem-details flex flex-col gap-2.5">
                                  {Object.entries(data.peemData).map(([axis, value]: [string, any]) => {
                                    if (axis === 'overall_score') return null;
                                    const scoreClass = value.score >= 80 ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' : value.score >= 60 ? 'text-amber-400 bg-amber-500/5 border-amber-500/10' : 'text-rose-400 bg-rose-500/5 border-rose-500/10';
                                    return (
                                      <div key={axis} className={`peem-axis-row p-3 rounded-lg border flex flex-col gap-1 ${scoreClass}`}>
                                        <div className="axis-info flex items-center justify-between">
                                          <span className="axis-name font-semibold text-xs capitalize text-slate-200">{axis.replace(/_/g, ' ')}</span>
                                          <span className="axis-score font-bold text-xs">{value.score}</span>
                                        </div>
                                        <div className="axis-reasoning text-[11px] text-slate-400 leading-relaxed">{value.reasoning}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="empty-state py-8 text-center text-slate-500">No PEEM data available.</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'templates' && <TemplateLibrary />}

                {activeTab === 'loop' && <OptimizationLoopPanel />}

                {activeTab === 'batch' && (
                  <div className="batch-container p-6 flex flex-col gap-4">
                    <div className="batch-header">
                      <h3 className="font-bold text-base text-slate-200">Massive Prompt Batch Testing</h3>
                      <p className="text-xs text-slate-400">Test your prompt against dozens of inputs simultaneously via CSV/JSON.</p>
                    </div>
                    
                    <DatasetUploader 
                      onFileSelect={batchUpload} 
                      isUploading={isBatching} 
                    />

                    {batchResults && (
                      <div className="batch-results-area flex flex-col gap-4 mt-4">
                        <BatchSummaryStats 
                          total={batchResults.total}
                          successful={batchResults.successful}
                          failed={batchResults.failed}
                        />
                        <BatchResultsTable results={batchResults.results} />
                      </div>
                    )}
                  </div>
                )}
                
                {activeTab === 'history' && (
                  <div className="history-container p-6 flex flex-col gap-4">
                    <div className="history-header border-b border-slate-900 pb-3 mb-1">
                      <h3 className="font-bold text-base text-slate-200">Saved Prompts & Regression History</h3>
                    </div>
                    
                    {history.length === 0 ? (
                      <div className="empty-state flex flex-col items-center justify-center py-16 gap-3 text-center text-slate-500">
                        <History size={40} className="empty-icon text-slate-600" />
                        <p className="text-xs">No saved prompts found. Save a version to see it here.</p>
                      </div>
                    ) : (
                      <div className="history-list flex flex-col gap-3">
                        {history.map((item, idx) => (
                          <div key={idx} className="history-card bg-slate-950/40 border border-slate-900 p-4 rounded-xl flex flex-col justify-between">
                            <div className="history-card-header flex items-center justify-between border-b border-slate-900/50 pb-2 mb-2">
                              <span className="history-version font-semibold text-xs text-slate-300">Version {item.version_id}</span>
                              <span className="history-date text-[10px] text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                            </div>
                            <div className="history-meta flex items-center gap-2 mb-2 select-none">
                              <span className="meta-pill text-[10px] font-medium bg-slate-900 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded-full">{item.model_used}</span>
                              {item.evaluation_score !== null && (
                                <span className={`meta-pill text-[10px] font-bold px-2 py-0.5 rounded-full ${item.evaluation_score >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : item.evaluation_score >= 60 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                  PEEM: {item.evaluation_score}
                                </span>
                              )}
                            </div>
                            <div className="history-content-preview font-mono text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-900 overflow-x-auto">
                              {item.content.substring(0, 150)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'visual' && (
                  <div className="visual-container w-full h-full" style={{ minHeight: '400px' }}>
                    <FlowCanvas />
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      
      <ExportModal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)} 
        codeSnippets={exportSnippets} 
      />
    </div>
  );
}

export default App;