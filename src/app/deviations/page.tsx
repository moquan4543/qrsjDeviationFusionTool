
'use client';

import React, { useState } from 'react';
import { getAbnormalities } from '@/lib/data';
import { AbnormalityCard } from '@/components/AbnormalityCard';
import { Search } from 'lucide-react';

export default function Home() {
  const [searchTerm, setSearchTerm] = useState('');
  const abnormalities = getAbnormalities();

  const filtered = abnormalities.filter(a => 
    a.name.includes(searchTerm) || 
    a.ultimateId.includes(searchTerm) || 
    a.passiveId.includes(searchTerm) ||
    a.learnableSkills.some(s => s.includes(searchTerm))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">異常物列表</h1>
          <p className="text-gray-500 mt-1">查看所有異常物及其技能資訊</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜尋名稱、主要技能或可掌握技能..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? (
          filtered.map(abnormality => (
            <AbnormalityCard key={abnormality.id} abnormality={abnormality} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500">
            找不到相符的異常物
          </div>
        )}
      </div>
    </div>
  );
}
