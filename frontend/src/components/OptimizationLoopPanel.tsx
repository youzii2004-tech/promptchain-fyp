import React, { useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';
import { Loader2, Zap, Check, Play, Gavel, PenLine, Trophy, ArrowUpRight, MinusCircle } from 'lucide-react';
import { usePromptStore } from '../store/usePromptStore';

const PHASES = [
  { icon: Play, label: 'Run', detail: 'prompt → target model' },
  { icon: Gavel, label: 'Judge', detail: '9-axis PEEM score' },
  { icon: PenLine, label: 'Rewrite', detail: 'candidates from feedback' },
  { icon: Trophy, label: 'Select', detail: 'keep best (elitism)' },
];

const OptimizationLoopPanel: React.FC = () => {
  const isLooping = usePromptStore(state => state.isLooping);
  const loopResult = usePromptStore(state => state.loopResult);
  const runOptimizationLoop = usePromptStore(state => state.runOptimizationLoop);
  const setPromptCode = usePromptStore(state => state.setPromptCode);

  const [maxIterations, setMaxIterations] = useState(3);
  const [beamWidth, setBeamWidth] = useState(2);

  const chartData = loopResult?.history?.map((round: any) => ({
    iteration: `Round ${round.iteration}`,
    score: round.chosen.overall_score,
    bestCandidate: Math.max(...round.candidates.map((c: any) => c.overall_score)),
  })) || [];

  const delta = loopResult ? loopResult.best_score - loopResult.baseline_score : 0;

  return (
    <div className="loop-container">
      <div className="loop-intro">
        <h3>Judge-in-the-Loop Optimization</h3>
        <p>
          Beam-search prompt refinement: each round generates candidate rewrites, scores them
          with the PEEM judge, and keeps the best one only if it beats the current best.
        </p>
      </div>

      <div className={`loop-pipeline ${isLooping ? 'looping' : ''}`}>
        {PHASES.map((phase, i) => (
          <React.Fragment key={phase.label}>
            {i > 0 && <div className="pipeline-arrow" aria-hidden="true" />}
            <div className="pipeline-phase" style={{ ['--phase-idx' as any]: i }}>
              <div className="pipeline-icon"><phase.icon size={16} /></div>
              <div className="pipeline-text">
                <span className="pipeline-label">{phase.label}</span>
                <span className="pipeline-detail">{phase.detail}</span>
              </div>
            </div>
          </React.Fragment>
        ))}
        <div className="pipeline-repeat" aria-hidden="true">↺ repeats each round</div>
      </div>

      <div className="loop-controls">
        <label>
          Iterations
          <input
            type="number" min={1} max={6} value={maxIterations}
            onChange={(e) => setMaxIterations(Number(e.target.value))}
          />
        </label>
        <label>
          Beam width
          <input
            type="number" min={1} max={4} value={beamWidth}
            onChange={(e) => setBeamWidth(Number(e.target.value))}
          />
        </label>
        <button
          className="loop-run-btn"
          onClick={() => runOptimizationLoop(maxIterations, beamWidth)}
          disabled={isLooping}
        >
          {isLooping ? <Loader2 size={18} className="spinner" /> : <Zap size={18} />}
          {isLooping ? 'Optimizing…' : 'Run optimization loop'}
        </button>
        {isLooping && (
          <span className="loop-live-note">
            Live run — each round makes real model calls, so a pause here is the judge working, not a stall.
          </span>
        )}
      </div>

      {loopResult && (
        <>
          <div className="loop-stats">
            <div className="loop-stat">
              <span className="loop-stat-label">Baseline</span>
              <span className="loop-stat-value">{loopResult.baseline_score}</span>
            </div>
            <div className="loop-stat accent">
              <span className="loop-stat-label">Best score</span>
              <span className="loop-stat-value">{loopResult.best_score}</span>
            </div>
            <div className={`loop-stat ${delta > 0 ? 'improved' : 'flat'}`}>
              <span className="loop-stat-label">Improvement</span>
              <span className="loop-stat-value">
                {delta > 0 ? `+${delta}` : '±0'}
                {delta > 0 ? <ArrowUpRight size={18} /> : <MinusCircle size={16} />}
              </span>
            </div>
          </div>

          <div className="loop-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="iteration" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(13,17,28,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#f8fafc' }} />
                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                <ReferenceLine
                  y={loopResult.baseline_score}
                  stroke="#64748b"
                  strokeDasharray="6 6"
                  label={{ value: 'baseline', fill: '#64748b', fontSize: 11, position: 'insideTopRight' }}
                />
                <Area type="monotone" dataKey="score" name="Chosen score" stroke="#818cf8" strokeWidth={2.5} fill="url(#scoreFill)" dot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="bestCandidate" name="Best candidate this round" stroke="#c084fc" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="loop-rounds">
            {loopResult.history.map((round: any) => (
              <div key={round.iteration} className="loop-round-card">
                <div className="loop-round-head">
                  <strong>Round {round.iteration}</strong>
                  <div className="loop-round-candidates">
                    {round.candidates.map((c: any, idx: number) => (
                      <span
                        key={idx}
                        className={`candidate-chip ${c.overall_score === round.chosen.overall_score && round.improved !== false ? 'winner' : ''}`}
                        title={round.iteration === 0 ? 'Baseline score' : `Candidate ${idx + 1} score`}
                      >
                        {c.overall_score}
                      </span>
                    ))}
                  </div>
                  <span className={`round-badge ${round.iteration === 0 ? 'baseline' : round.improved ? 'improved' : 'kept'}`}>
                    {round.iteration === 0 ? 'Baseline' : round.improved ? 'Improved' : 'Kept previous best'}
                  </span>
                </div>
                <pre className="loop-round-prompt">{round.chosen.prompt}</pre>
              </div>
            ))}
          </div>

          <button className="loop-load-btn" onClick={() => setPromptCode(loopResult.best_prompt)}>
            <Check size={18} /> Load best prompt into editor
          </button>
        </>
      )}
    </div>
  );
};

export default OptimizationLoopPanel;
