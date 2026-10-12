import { create } from 'zustand';
import { type Node, type Edge, applyNodeChanges, applyEdgeChanges, addEdge, type NodeChange, type EdgeChange, type Connection } from '@xyflow/react';
import toast from 'react-hot-toast';

const DEFAULT_PROMPT = 'You are an expert AI assistant evaluating code quality...\n\n# Code to Evaluate\nconsole.log("hello world");\n\n# Instructions\nProvide a score and reasoning in the requested JSON format.';

const DEFAULT_SCHEMA = `{
  "type": "object",
  "properties": {
    "evaluation_score": { "type": "number", "minimum": 0, "maximum": 100 },
    "reasoning": { "type": "string" }
  },
  "required": ["evaluation_score", "reasoning"],
  "additionalProperties": false
}`;

const INITIAL_NODES: Node[] = [
  { id: 'in1', type: 'inputNode', position: { x: 100, y: 100 }, data: { label: 'Input', value: 'Explain quantum entanglement' } },
  { id: 'llm1', type: 'llmNode', position: { x: 400, y: 100 }, data: { label: 'LLM Agent', model: 'llama-70b', prompt: 'Summarize this in 2 sentences: {in1}' } },
  { id: 'out1', type: 'outputNode', position: { x: 750, y: 100 }, data: { label: 'Output', output: '' } },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: 'in1', target: 'llm1' },
  { id: 'e2-3', source: 'llm1', target: 'out1' },
];

interface ResultItem {
  output: string;
  metrics?: {
    usage?: { total_tokens: number };
    model?: string;
  };
  isEvaluating?: boolean;
  peemData?: any;
}

interface PromptState {
  promptCode: string;
  schemaCode: string;
  selectedModels: string[];
  results: Record<string, ResultItem>;
  history: any[];
  isBatching: boolean;
  batchResults: any;
  isSaving: boolean;
  isOptimizing: boolean;
  isRunning: boolean;
  isLooping: boolean;
  loopResult: any;
  activeTab: 'schema' | 'output' | 'peem' | 'history' | 'batch' | 'visual' | 'loop' | 'templates';
  nodes: Node[];
  edges: Edge[];

  // Actions
  setPromptCode: (code: string) => void;
  setSchemaCode: (code: string) => void;
  setSelectedModels: (models: string[] | ((prev: string[]) => string[])) => void;
  setActiveTab: (tab: 'schema' | 'output' | 'peem' | 'history' | 'batch' | 'visual' | 'loop' | 'templates') => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  
  // Async Business Logic
  fetchHistory: () => Promise<void>;
  runPrompt: () => Promise<void>;
  evaluatePEEM: () => Promise<void>;
  saveVersion: () => Promise<void>;
  optimizePrompt: () => Promise<void>;
  runOptimizationLoop: (maxIterations: number, beamWidth: number) => Promise<void>;
  batchUpload: (file: File) => Promise<void>;
  runChain: () => Promise<void>;
}

export const usePromptStore = create<PromptState>((set, get) => ({
  promptCode: DEFAULT_PROMPT,
  schemaCode: DEFAULT_SCHEMA,
  selectedModels: ['llama-70b'],
  results: { 'llama-70b': { output: '// Run an evaluation to see output here...' } },
  history: [],
  isBatching: false,
  batchResults: null,
  isSaving: false,
  isOptimizing: false,
  isRunning: false,
  isLooping: false,
  loopResult: null,
  activeTab: 'schema',
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,

  setPromptCode: (code) => set({ promptCode: code }),
  setSchemaCode: (code) => set({ schemaCode: code }),
  setSelectedModels: (models) => set((state) => ({ 
    selectedModels: typeof models === 'function' ? models(state.selectedModels) : models 
  })),
  setActiveTab: (tab) => set({ activeTab: tab }),

  onNodesChange: (changes) => set((state) => ({
    nodes: applyNodeChanges(changes, state.nodes)
  })),
  onEdgesChange: (changes) => set((state) => ({
    edges: applyEdgeChanges(changes, state.edges)
  })),
  onConnect: (connection) => set((state) => ({
    edges: addEdge(connection, state.edges)
  })),

  fetchHistory: async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/history`);
      if (response.ok) {
        const data = await response.json();
        set({ history: data.history });
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  },

  runPrompt: async () => {
    const { selectedModels, promptCode, schemaCode, results } = get();
    if (selectedModels.length === 0) {
      toast.error("Select at least one model to run.");
      return;
    }

    set({ isRunning: true, activeTab: 'output' });
    
    const updatedResults = { ...results };
    selectedModels.forEach(m => {
      updatedResults[m] = { ...updatedResults[m], output: '// Executing...', isEvaluating: false, peemData: null };
    });
    set({ results: updatedResults });

    try {
      await Promise.all(selectedModels.map(async (modelId) => {
        try {
          let parsedSchema = null;
          try {
            if (schemaCode && schemaCode.trim() !== '') {
              parsedSchema = JSON.parse(schemaCode);
            }
          } catch (e) {
            set((state) => ({
              results: { ...state.results, [modelId]: { output: `// JSON Schema Error\n${(e as Error).message}` } }
            }));
            return;
          }

          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptCode, model: modelId, json_schema: parsedSchema })
          });

          const data = await response.json();
          if (!response.ok) {
            set((state) => ({
              results: { ...state.results, [modelId]: { output: `// API Error (${response.status})\n${JSON.stringify(data, null, 2)}` } }
            }));
          } else {
            set((state) => ({
              results: { ...state.results, [modelId]: { output: data.content, metrics: { usage: data.usage, model: data.model } } }
            }));
          }
        } catch (err) {
          set((state) => ({
            results: { ...state.results, [modelId]: { output: `// Network Error\n${(err as Error).message}` } }
          }));
        }
      }));
    } finally {
      set({ isRunning: false });
    }
  },

  evaluatePEEM: async () => {
    const { selectedModels, results, promptCode } = get();
    const modelsToEvaluate = selectedModels.filter(m => results[m] && results[m].output && !results[m].output.startsWith('//'));
    
    if (modelsToEvaluate.length === 0) {
      toast.error("Please run the prompt first to generate valid outputs before evaluating.");
      return;
    }
    
    set({ activeTab: 'peem' });
    
    const updatedResults = { ...results };
    modelsToEvaluate.forEach(m => {
      updatedResults[m] = { ...updatedResults[m], isEvaluating: true };
    });
    set({ results: updatedResults });

    await Promise.all(modelsToEvaluate.map(async (modelId) => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptCode, output: results[modelId].output, judge_model: 'llama-8b' })
        });

        const data = await response.json();
        if (!response.ok) {
          set((state) => ({
            results: { ...state.results, [modelId]: { ...state.results[modelId], isEvaluating: false } }
          }));
        } else {
          set((state) => ({
            results: { ...state.results, [modelId]: { ...state.results[modelId], isEvaluating: false, peemData: data.evaluation } }
          }));
        }
      } catch (err) {
        set((state) => ({
          results: { ...state.results, [modelId]: { ...state.results[modelId], isEvaluating: false } }
        }));
      }
    }));
  },

  saveVersion: async () => {
    const { schemaCode, selectedModels, results, promptCode, fetchHistory } = get();
    set({ isSaving: true });
    try {
      let parsedSchema = null;
      try { parsedSchema = JSON.parse(schemaCode); } catch (e) {}

      const primaryModel = selectedModels[0];
      const primaryResult = results[primaryModel];

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "My React Component Prompt",
          prompt_content: promptCode,
          model_used: primaryModel,
          json_schema: parsedSchema,
          evaluation_scores: primaryResult?.peemData || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(`API Error: ${JSON.stringify(data)}`);
      } else {
        toast.success(`Prompt Version ${data.version_id} saved successfully!`);
        fetchHistory();
      }
    } catch (err) {
      toast.error(`Network Error: ${(err as Error).message}`);
    } finally {
      set({ isSaving: false });
    }
  },

  optimizePrompt: async () => {
    const { selectedModels, results, promptCode } = get();
    const primaryModel = selectedModels[0];
    const peemData = results[primaryModel]?.peemData;
    
    if (!peemData) {
      toast.error("Please run 'PEEM Score' first so the optimizer knows what to fix.");
      return;
    }
    
    set({ isOptimizing: true });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptCode, peem_evaluation: peemData })
      });
      
      if (!response.ok) throw new Error("Optimization failed.");
      const data = await response.json();
      set({ promptCode: data.optimized_prompt });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      set({ isOptimizing: false });
    }
  },

  runOptimizationLoop: async (maxIterations: number, beamWidth: number) => {
    const { selectedModels, promptCode } = get();
    const targetModel = selectedModels[0] || 'llama-70b';

    set({ isLooping: true, loopResult: null });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/optimize/loop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptCode,
          target_model: targetModel,
          judge_model: 'llama-8b',
          optimizer_model: 'llama-8b',
          max_iterations: maxIterations,
          beam_width: beamWidth,
        }),
      });

      if (!response.ok) throw new Error('Optimization loop failed.');
      const data = await response.json();
      set({ loopResult: data });
      toast.success(`Loop complete: ${data.baseline_score} -> ${data.best_score}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      set({ isLooping: false });
    }
  },

  batchUpload: async (file: File) => {
    const { promptCode, selectedModels, schemaCode } = get();
    set({ isBatching: true });
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', promptCode);
      formData.append('model', selectedModels[0] || 'llama-70b');
      if (schemaCode && schemaCode.trim() !== '') {
        formData.append('json_schema', schemaCode);
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/batch`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Batch testing failed.');
      const data = await response.json();
      set({ batchResults: data });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      set({ isBatching: false });
    }
  },

  runChain: async () => {
    const { nodes, edges } = get();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chain/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges }),
      });

      if (response.ok) {
        const result = await response.json();
        set((state) => ({
          nodes: state.nodes.map((node) => {
            if (node.type === 'outputNode') {
              const nodeOutputs = result.results.node_outputs || result.results || result;
              // The backend's outputNode entry is {sourceNodeId: sourceOutput, ...}
              // (it can have multiple incoming edges), not a plain string - render
              // nodes expect a string, so this must be flattened rather than handed
              // to React as an object (which throws and blanks the whole app).
              const raw = nodeOutputs[node.id] ?? nodeOutputs.output ?? nodeOutputs;
              const outputText = typeof raw === 'string'
                ? raw
                : raw && typeof raw === 'object'
                  ? Object.values(raw).map(v => typeof v === 'string' ? v : JSON.stringify(v)).join('\n\n')
                  : String(raw ?? '');
              return {
                ...node,
                data: { ...node.data, output: outputText }
              };
            }
            return node;
          })
        }));
      }
    } catch (err) {
      console.error('Failed to run chain:', err);
    }
  }
}));
