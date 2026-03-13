
'use client';

import React from 'react';
import { Abnormality } from '@/types';
import { getSkillById } from '@/lib/data';
import { SkillTooltip } from './SkillTooltip';
import { Shield, Sparkles, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AbnormalityCardProps {
  abnormality: Abnormality;
}

export const AbnormalityCard: React.FC<AbnormalityCardProps> = ({ abnormality }) => {
  const t = useTranslations('Components.AbnormalityCard');
  const tData = useTranslations('Data');
  const ult = abnormality.ultimateId ? getSkillById(abnormality.ultimateId) : undefined;
  const passive = abnormality.passiveId ? getSkillById(abnormality.passiveId) : undefined;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            {tData(`Abnormalities.${abnormality.id}.name`)}
          </h3>
          <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
            {abnormality.id}
          </span>
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
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-400">
          <span>{t('traitSlots')} {abnormality.traitSlots}</span>
          <span>{t('weight')} {abnormality.weight}</span>
        </div>
      </div>
    </div>
  );
};
