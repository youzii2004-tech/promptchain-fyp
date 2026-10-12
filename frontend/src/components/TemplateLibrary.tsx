import React, { useEffect, useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { usePromptStore } from '../store/usePromptStore';

interface Template {
  id: string;
  domain: string;
  title: string;
  description: string;
  template: string;
  tags: string[];
}

const DOMAIN_LABELS: Record<string, string> = {
  algorithms: 'Algorithms & Data Structures',
  debugging: 'Debugging Assistance',
  system_design: 'System Design',
  research: 'Research Synthesis',
  code_review: 'Code Review & Refactoring',
};

const DOMAIN_COLORS: Record<string, string> = {
  algorithms: '#818cf8',
  debugging: '#f87171',
  system_design: '#38bdf8',
  research: '#c084fc',
  code_review: '#4ade80',
};

const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState('');
  const [activeDomain, setActiveDomain] = useState<string>('all');
  const setPromptCode = usePromptStore(state => state.setPromptCode);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/templates`)
      .then(res => res.json())
      .then(data => setTemplates(data.templates || []))
      .catch(() => setTemplates([]));
  }, []);

  const domains = ['all', ...Array.from(new Set(templates.map(t => t.domain)))];

  const filtered = templates.filter(t => {
    const matchesDomain = activeDomain === 'all' || t.domain === activeDomain;
    const q = search.toLowerCase();
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.tags.some(tag => tag.toLowerCase().includes(q));
    return matchesDomain && matchesSearch;
  });

  return (
    <div style={{ padding: '32px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={22} /> CS-Domain Prompt Template Library
        </h3>
        <p style={{ color: 'var(--text-secondary)' }}>{templates.length} templates across {domains.length - 1} CS domains. Click one to load it into the editor.</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            placeholder="Search templates or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px 8px 30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', minWidth: '220px' }}
          />
        </div>
        {domains.map(d => (
          <button
            key={d}
            onClick={() => setActiveDomain(d)}
            style={{
              padding: '6px 14px', borderRadius: '999px', fontSize: '0.8rem', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)',
              background: activeDomain === d ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255,255,255,0.03)',
              color: activeDomain === d ? '#818cf8' : 'var(--text-secondary)',
            }}
          >
            {d === 'all' ? 'All' : DOMAIN_LABELS[d] || d}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {filtered.map(t => (
          <div
            key={t.id}
            onClick={() => setPromptCode(t.template)}
            style={{
              padding: '16px', borderRadius: '12px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
              borderLeft: `3px solid ${DOMAIN_COLORS[t.domain] || '#818cf8'}55`,
              transition: 'border-color 0.2s, transform 0.15s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = `${DOMAIN_COLORS[t.domain] || '#818cf8'}88`;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
              e.currentTarget.style.borderLeftColor = `${DOMAIN_COLORS[t.domain] || '#818cf8'}55`;
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ fontSize: '0.7rem', color: DOMAIN_COLORS[t.domain] || '#818cf8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {DOMAIN_LABELS[t.domain] || t.domain}
            </div>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>{t.title}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>{t.description}</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {t.tags.map(tag => (
                <span key={tag} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text-secondary)' }}>No templates match.</div>
        )}
      </div>
    </div>
  );
};

export default TemplateLibrary;
