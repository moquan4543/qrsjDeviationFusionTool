
'use client';

import React, { useState } from 'react';
import { Abnormality } from '@/types';
import { getSkillById } from '@/lib/data';
import { SkillTooltip } from './SkillTooltip';
import { Shield, Sparkles, Wand2, MapPin, Box } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

interface AbnormalityCardProps {
  abnormality: Abnormality;
}

export const AbnormalityCard: React.FC<AbnormalityCardProps> = ({ abnormality }) => {
  const t = useTranslations('Components.AbnormalityCard');
  const tData = useTranslations('Data');
  const ult = abnormality.ultimateId ? getSkillById(abnormality.ultimateId) : undefined;
  const passive = abnormality.passiveId ? getSkillById(abnormality.passiveId) : undefined;
  const [showStatues, setShowStatues] = useState(false);

  const hasStatues = abnormality.wishingStatues && abnormality.wishingStatues.length > 0;
  
  const wayToGetRaw = tData.raw(`Abnormalities.${abnormality.id}.wayToGet`);
  const translatedWayToGet = Array.isArray(wayToGetRaw) ? wayToGetRaw : abnormality.wayToGet;
  
  const statuesRaw = tData.raw(`Abnormalities.${abnormality.id}.wishingStatues`);
  const translatedStatues = Array.isArray(statuesRaw) ? statuesRaw : abnormality.wishingStatues;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 overflow-visible">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            {tData(`Abnormalities.${abnormality.id}.name`)}
          </h3>
          <div className="flex items-center gap-2">
            {hasStatues && (
              <div className="relative">
                <motion.span
                  onMouseEnter={() => setShowStatues(true)}
                  onMouseLeave={() => setShowStatues(false)}
                  onClick={() => setShowStatues(!showStatues)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="mr-1 text-sm font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded border border-amber-200 dark:border-amber-800 cursor-help select-none inline-block"
                >
                  {t('wishingStatue')}
                </motion.span>
                <AnimatePresence>
                  {showStatues && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute right-0 bottom-full mb-2 z-50 w-48 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-amber-100 dark:border-amber-800"
                    >
                      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {t('wishingStatue')}
                      </div>
                      <div className="space-y-1">
                        {translatedStatues.map((statue, i) => (
                          <div key={i} className="text-[11px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded">
                            {statue}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
              {abnormality.id}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {(abnormality.ultimateId || abnormality.passiveId) && (
            <div>
              <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1">
                <Wand2 className="w-4 h-4" /> {t('mainSkills')}
              </div>
              <div className="flex flex-wrap gap-2">
                {abnormality.ultimateId && (
                  <SkillTooltip skill={ult}>
                    <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-sm cursor-help border border-indigo-100 dark:border-indigo-800">
                      {tData(`Skills.${abnormality.ultimateId}.name`)}
                    </span>
                  </SkillTooltip>
                )}
                {abnormality.passiveId && (
                  <SkillTooltip skill={passive}>
                    <span className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-sm cursor-help border border-emerald-100 dark:border-emerald-800">
                      {tData(`Skills.${abnormality.passiveId}.name`)}
                    </span>
                  </SkillTooltip>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1">
              <Shield className="w-4 h-4" /> {t('learnableSkills')} ({abnormality.learnableSkills.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {abnormality.learnableSkills.map((skillName, idx) => {
                const s = getSkillById(skillName);
                return (
                  <SkillTooltip key={idx} skill={s}>
                    <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs cursor-help border border-gray-200 dark:border-gray-600">
                      {tData(`Skills.${skillName}.name`)}
                    </span>
                  </SkillTooltip>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1">
              <Box className="w-4 h-4" /> {t('wayToGet')}
            </div>
            <div className="flex flex-wrap gap-1">
              {translatedWayToGet.map((way, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-[11px] border border-blue-100 dark:border-blue-900/50">
                  {way}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-400">
          <span>{t('traitSlots')} {abnormality.traitSlots}</span>
          <span>{t('weight')} {abnormality.weight}</span>
        </div>
      </div>
    </div>
  );
};
