
'use client';

import React, { useState, useMemo } from 'react';
import { getAbnormalities, getSkills, filterAbnormalities } from '@/lib/data';
import { AbnormalityCard } from '@/components/AbnormalityCard';
import { SkillSelector } from '@/components/SkillSelector';
import { SlidersHorizontal, Trash2 } from 'lucide-react';

export default function FilterPage() {
  const [targetSkills, setTargetSkills] = useState<string[]>([]);
  const [excludeSkills, setExcludeSkills] = useState<string[]>([]);
  
  const allSkills = getSkills();
  const abnormalities = getAbnormalities();

  const filtered = useMemo(() => {
    if (targetSkills.length === 0 && excludeSkills.length === 0) {
      return abnormalities;
    }
    return filterAbnormalities(targetSkills, excludeSkills);
  }, [targetSkills, excludeSkills, abnormalities]);

  const clearFilters = () => {
    setTargetSkills([]);
    setExcludeSkills([]);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SlidersHorizontal className="w-8 h-8 text-indigo-500" />
          技能提純搜尋
        </h1>
        <p className="text-gray-500 mt-1">找到包含特定技能且排除不想要技能的異常物</p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              目標技能 (Target Skills)
            </label>
            <SkillSelector 
              skills={allSkills} 
              selectedIds={targetSkills} 
              onChange={setTargetSkills}
              placeholder="搜尋需要的技能..."
            />
            <p className="text-xs text-gray-400">系統將篩選出「包含所有」目標技能的異常物</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              排除技能 (Exclude Skills)
            </label>
            <SkillSelector 
              skills={allSkills} 
              selectedIds={excludeSkills} 
              onChange={setExcludeSkills}
              placeholder="搜尋要排除的技能..."
            />
            <p className="text-xs text-gray-400">系統將移除「包含任何」排除技能的異常物</p>
          </div>
        </div>

        {(targetSkills.length > 0 || excludeSkills.length > 0) && (
          <div className="flex justify-end border-t border-gray-50 dark:border-gray-700 pt-4">
            <button 
              onClick={clearFilters}
              className="text-sm flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors font-medium"
            >
              <Trash2 className="w-4 h-4" /> 重置篩選
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            搜尋結果 ({filtered.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length > 0 ? (
            filtered.map(abnormality => (
              <AbnormalityCard key={abnormality.id} abnormality={abnormality} />
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
              沒有符合條件的異常物，請調整篩選條件。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
