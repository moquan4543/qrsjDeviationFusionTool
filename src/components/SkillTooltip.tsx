
'use client';

import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skill } from '@/types';
import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SkillTooltipProps {
  skill: Skill | undefined;
  children: React.ReactNode;
}

export const SkillTooltip: React.FC<SkillTooltipProps> = ({ skill, children }) => {
  const tData = useTranslations('Data');
  const tSkills = useTranslations('Skills');
  const [isVisible, setIsVisible] = useState(false);
  const [offset, setOffset] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // We use useLayoutEffect to measure the tooltip size before it's displayed to the user
  // This avoids the "flicker" where the tooltip starts in the wrong position.
  const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

  useIsomorphicLayoutEffect(() => {
    if (isVisible && tooltipRef.current) {
      const updatePosition = () => {
        if (!tooltipRef.current) return;
        const rect = tooltipRef.current.getBoundingClientRect();
        const padding = 16;
        let newOffset = 0;
        
        if (rect.left < padding) {
          newOffset = padding - rect.left;
        } else if (rect.right > window.innerWidth - padding) {
          newOffset = (window.innerWidth - padding) - rect.right;
        }
        
        if (newOffset !== 0) {
          setOffset(newOffset);
        }
      };

      // Use requestAnimationFrame to defer the state update until after the initial render of the tooltip
      // This satisfies ESLint's requirement for non-synchronous updates in effects.
      const frameId = requestAnimationFrame(updatePosition);
      return () => cancelAnimationFrame(frameId);
    } else {
      setOffset(0);
    }
  }, [isVisible]);

  if (!skill) return <>{children}</>;

  const skillNameKey = skill.id || skill.name;

  return (
    <motion.div 
      className="relative inline-block select-none cursor-help"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onClick={() => setIsVisible(!isVisible)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
              <div className="font-bold text-yellow-400 text-base">
                {tData(`Skills.${skillNameKey}.name`)}
              </div>
              {skill.cooldown && (
                <div className="flex items-center gap-1 text-xs text-blue-400 whitespace-nowrap bg-blue-400/10 px-1.5 py-0.5 rounded border border-blue-400/20">
                  <Clock className="w-3 h-3" />
                  {skill.cooldown}s
                </div>
              )}
            </div>
            <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {tData(`Skills.${skillNameKey}.description`) || tSkills('noDescription')}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
