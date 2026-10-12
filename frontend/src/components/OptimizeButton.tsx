import React from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface OptimizeButtonProps {
  onClick: () => void;
  isOptimizing: boolean;
}

export const OptimizeButton: React.FC<OptimizeButtonProps> = ({ onClick, isOptimizing }) => {
  return (
    <>
      <style>
        {`
          @keyframes optimize-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .optimize-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 1rem;
            font-weight: 600;
            color: #ffffff;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            outline: none;
          }
          .optimize-btn:not(:disabled) {
            cursor: pointer;
            background: rgba(255, 255, 255, 0.05);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .optimize-btn:not(:disabled):hover {
            background: rgba(255, 255, 255, 0.1);
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
          }
          .optimize-btn:disabled {
            cursor: not-allowed;
            background: rgba(168, 85, 247, 0.2);
            color: rgba(255, 255, 255, 0.8);
          }
          .optimize-spin-icon {
            animation: optimize-spin 1s linear infinite;
            color: #c084fc;
          }
          .optimize-wand-icon {
            color: #c084fc;
          }
        `}
      </style>
      <motion.button
        onClick={onClick}
        disabled={isOptimizing}
        className={`optimize-btn ${isOptimizing ? 'pulse-glow' : ''}`}
        whileTap={{ scale: 0.98 }}
      >
        {isOptimizing ? (
          <>
            <Loader2 size={20} className="optimize-spin-icon" />
            <span>Optimizing...</span>
          </>
        ) : (
          <>
            <Wand2 size={20} className="optimize-wand-icon" />
            <span>Auto-Optimize</span>
          </>
        )}
      </motion.button>
    </>
  );
};

export default OptimizeButton;