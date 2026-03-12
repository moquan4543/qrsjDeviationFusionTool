
'use client';

import React, { useState } from 'react';
import { getSkills } from '@/lib/data';
import { Search, Info, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SkillsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const skills = getSkills();

  const filtered = skills.filter(s => 
    (s.name || '').includes(searchTerm) || 
    (s.description || '').includes(searchTerm)
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">技能列表</h1>
          <p className="text-gray-500 mt-1">瀏覽系統中所有的技能及其詳細效果</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜尋技能名稱或描述..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(skill => (
          <div key={skill.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col relative group hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded transition-colors",
                  skill.cooldown 
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500" 
                    : "bg-amber-50 dark:bg-amber-900/30 text-amber-500"
                )}>
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="font-bold">{skill.name}</h3>
              </div>
              
              {skill.cooldown && (
                <div className="flex items-center gap-1 text-[10px] font-mono text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800/50">
                  <Clock className="w-3 h-3" />
                  {skill.cooldown}s
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 leading-relaxed">
              {skill.description || '暫無描述'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
