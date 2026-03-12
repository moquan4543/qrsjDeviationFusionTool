
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skill } from '@/types';
import { Clock } from 'lucide-react';

interface SkillTooltipProps {
  skill: Skill | undefined;
  children: React.ReactNode;
}

export const SkillTooltip: React.FC<SkillTooltipProps> = ({ skill, children }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [offset, setOffset] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const padding = 16;
      let newOffset = 0;
      
      if (rect.left < padding) {
        newOffset = padding - rect.left;
      } else if (rect.right > window.innerWidth - padding) {
        newOffset = (window.innerWidth - padding) - rect.right;
      }
      
      setOffset(newOffset);
    } else {
      setOffset(0);
    }
  }, [isVisible]);

  if (!skill) return <>{children}</>;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[85vw] max-w-72 p-4 bg-gray-900 text-white rounded-lg shadow-2xl z-[100] border border-gray-700 pointer-events-none"
            style={{ 
              x: offset, // Correct way with framer-motion x property
            }}
          >
            <div className="flex justify-between items-start mb-2 gap-4">
              <div className="font-bold text-yellow-400 text-base">{skill.name}</div>
              {skill.cooldown && (
                <div className="flex items-center gap-1 text-xs text-blue-400 whitespace-nowrap bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
                  <Clock className="w-3 h-3" />
                  {skill.cooldown}s
                </div>
              )}
            </div>
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{skill.description || '暫無描述'}</div>
            {/* The arrow should stay centered to the tag, not the adjusted tooltip */}
            <div 
              className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rotate-45 border-r border-b border-gray-700 -mt-1"
              style={{ transform: `translateX(calc(-50% - ${offset}px)) rotate(45deg)` }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
