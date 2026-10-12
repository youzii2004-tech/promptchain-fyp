import React, { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  codeSnippets: {
    python: string;
    nextjs: string;
    curl: string;
  };
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, codeSnippets }) => {
  const [activeTab, setActiveTab] = useState<'python' | 'nextjs' | 'curl'>('python');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeSnippets[activeTab] || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const tabs = [
    { id: 'python', label: 'Python (FastAPI)' },
    { id: 'nextjs', label: 'Next.js' },
    { id: 'curl', label: 'cURL' },
  ] as const;

  return (
    <>
      <style>
        {`
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 50;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            padding: 20px;
          }
          .modal-content {
            position: relative;
            width: 100%;
            max-width: 800px;
            background: #0d111c;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(0, 0, 0, 0.2);
          }
          .modal-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #fff;
            margin: 0;
          }
          .modal-close-btn {
            background: transparent;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            border-radius: 8px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .modal-close-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.1);
          }
          .modal-tabs {
            display: flex;
            padding: 16px 24px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(0, 0, 0, 0.1);
            gap: 8px;
          }
          .modal-tab-btn {
            padding: 10px 20px;
            font-size: 0.9rem;
            font-weight: 500;
            color: #94a3b8;
            background: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            transition: all 0.2s;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
          }
          .modal-tab-btn:hover {
            color: #e2e8f0;
            background: rgba(255, 255, 255, 0.03);
          }
          .modal-tab-btn.active {
            color: #818cf8;
            border-bottom-color: #818cf8;
            background: rgba(99, 102, 241, 0.1);
          }
          .modal-code-area {
            position: relative;
            padding: 24px;
            background: #07090f;
            overflow: auto;
            max-height: 60vh;
          }
          .modal-copy-btn {
            position: absolute;
            top: 20px;
            right: 24px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            font-size: 0.85rem;
            font-weight: 500;
            color: #cbd5e1;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
          }
          .modal-copy-btn:hover {
            background: #334155;
            color: #fff;
          }
          .modal-copy-btn.copied {
            color: #4ade80;
            border-color: #4ade80;
          }
          .modal-pre {
            margin: 0;
            padding-top: 20px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.85rem;
            color: #e2e8f0;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
        `}
      </style>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="modal-header">
                <h2 className="modal-title">Export Integration Code</h2>
                <button className="modal-close-btn" onClick={onClose}>
                  <X size={20} />
                </button>
              </div>

              <div className="modal-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'python' | 'nextjs' | 'curl')}
                    className={`modal-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="modal-code-area">
                <button className={`modal-copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
                  {copied ? (
                    <>
                      <Check size={16} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
                <pre className="modal-pre">
                  <code>{codeSnippets[activeTab]}</code>
                </pre>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ExportModal;