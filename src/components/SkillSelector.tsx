
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Skill } from '@/types';
import { X, Search, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SkillSelectorProps {
  skills: Skill[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export const SkillSelector: React.FC<SkillSelectorProps> = ({ 
  skills, 
  selectedIds, 
  onChange, 
  placeholder = "選擇技能..." 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSkills = skills.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !selectedIds.includes(s.name)
  );

  const toggleSelect = (skillName: string) => {
    if (selectedIds.includes(skillName)) {
      onChange(selectedIds.filter(id => id !== skillName));
    } else {
      onChange([...selectedIds, skillName]);
    }
    setSearchTerm('');
  };

  const removeSelect = (skillName: string) => {
    onChange(selectedIds.filter(id => id !== skillName));
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        className="min-h-[42px] p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 flex flex-wrap gap-1.5 cursor-pointer items-center shadow-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedIds.length === 0 && (
          <span className="text-gray-400 px-2">{placeholder}</span>
        )}
        {selectedIds.map(id => (
          <span 
            key={id} 
            className="flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md text-sm"
          >
            {id}
            <X 
              className="w-3.5 h-3.5 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors" 
              onClick={(e) => {
                e.stopPropagation();
                removeSelect(id);
              }}
            />
          </span>
        ))}
        <div className="ml-auto px-2">
          <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              autoFocus
              className="w-full bg-transparent outline-none text-sm p-1"
              placeholder="搜尋技能名稱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filteredSkills.length > 0 ? (
              filteredSkills.map(skill => (
                <div
                  key={skill.id}
                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer text-sm transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(skill.name);
                  }}
                >
                  <div className="font-medium">{skill.name}</div>
                  <div className="text-xs text-gray-400 truncate">{skill.description}</div>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-sm text-gray-400">找不到相符的技能</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
