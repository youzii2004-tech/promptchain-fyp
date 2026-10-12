import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface RadarProps {
  data: any;
}

const PEEMRadarChart: React.FC<RadarProps> = React.memo(({ data }) => {
  // Format data for Recharts
  const chartData = [
    { subject: 'Schema', A: data.schema_adherence?.score || 0, fullMark: 100 },
    { subject: 'Clarity', A: data.clarity?.score || 0, fullMark: 100 },
    { subject: 'Edge Cases', A: data.edge_case_handling?.score || 0, fullMark: 100 },
    { subject: 'Efficiency', A: data.token_efficiency?.score || 0, fullMark: 100 },
    { subject: 'Factuality', A: data.hallucination_resistance?.score || 0, fullMark: 100 },
    { subject: 'Persona', A: data.persona_consistency?.score || 0, fullMark: 100 },
    { subject: 'Few-Shot', A: data.few_shot_quality?.score || 0, fullMark: 100 },
    { subject: 'Constraints', A: data.constraint_satisfaction?.score || 0, fullMark: 100 },
    { subject: 'Reasoning', A: data.reasoning_depth?.score || 0, fullMark: 100 },
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
        <defs>
          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
          </linearGradient>
        </defs>
        <PolarGrid stroke="rgba(255,255,255,0.15)" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip 
          contentStyle={{ backgroundColor: 'rgba(13,17,28,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
          itemStyle={{ color: '#818cf8', fontWeight: 600 }}
        />
        <Radar name="PEEM Score" dataKey="A" stroke="#818cf8" strokeWidth={2} fill="url(#colorUv)" fillOpacity={1} />
      </RadarChart>
    </ResponsiveContainer>
  );
});

export default PEEMRadarChart;
