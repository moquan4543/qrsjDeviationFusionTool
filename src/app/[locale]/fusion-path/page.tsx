'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, Calculator, ChevronRight, ChevronDown, 
  Package, Sword, Info, X, Settings2, AlertCircle,
  HelpCircle, ExternalLink, RefreshCcw
} from 'lucide-react';
import { getAbnormalities, getTraits } from '@/lib/data';
import { UserInventoryDeviant, Trait, MissingRequirement } from '@/types';
import { useDeviantSolver } from '@/hooks/useDeviantSolver';

export default function FusionPathPage() {
  const t = useTranslations('FusionPath');
  const abnormalities = useMemo(() => getAbnormalities(), []);
  const traits = useMemo(() => getTraits(), []);

  const [inventory, setInventory] = useState<UserInventoryDeviant[]>([]);
  const [targetAbnormalityId, setTargetAbnormalityId] = useState<string>(abnormalities[0]?.id || '');
  const [selectedTraitIds, setSelectedTraitIds] = useState<string[]>([]);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  
  const { solve, loading } = useDeviantSolver();
  const [result, setResult] = useState<any>(null);

  const targetAbnormality = useMemo(() => 
    abnormalities.find(a => a.id === targetAbnormalityId), 
    [targetAbnormalityId, abnormalities]
  );

  // Dynamic Trait Filtering (Requirement 1: Logic fix)
  const filteredAvailableTraits = useMemo(() => {
    if (!targetAbnormality) return [];
    return traits.filter(trait => {
        const type = targetAbnormality.type;
        const name = targetAbnormality.name;

        // Rule 1: boundSpecies match (exact name or type)
        if (trait.boundSpecies) {
            if (trait.boundSpecies === name) return true;
            if (trait.boundSpecies === type || trait.boundSpecies === `${type}型`) return true;
            return trait.boundSpecies === '造物/領地' && (type === '造物' || type === '領地');

        }
        
        // Rule 2 & 3: Category match or "通用"
        return trait.category === '通用' || trait.category === type;
    });
  }, [targetAbnormality, traits]);

  // Load inventory from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('oh_deviant_inventory');
    if (saved) {
      try {
        setInventory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse inventory", e);
      }
    }
  }, []);

  // Save inventory to localStorage
  useEffect(() => {
    localStorage.setItem('oh_deviant_inventory', JSON.stringify(inventory));
  }, [inventory]);

  const handleSolve = () => {
    const res = solve(inventory, { targetAbnormalityId, desiredTraitIds: selectedTraitIds });
    setResult(res);
  };

  const handleDeduct = () => {
    if (!result || !result.steps) return;
    
    let currentInventory = [...inventory];
    const itemsToRemove = new Set<string>();
    const itemsToSetToZero = new Set<string>();

    const traverse = (node: any) => {
        if (!node) return;
        if (node.type === 'step') {
            const step = node.step;
            
            // Parents -> Count becomes 0
            const processParent = (p: any) => {
                if (p.type === 'inventory') itemsToSetToZero.add(p.id);
                else if (p.type === 'step') traverse(p);
            };
            processParent(step.left);
            processParent(step.right);

            // Mids -> Permanently Deleted
            step.mids.forEach((m: any) => {
                if (m.type === 'inventory') itemsToRemove.add(m.id);
                else if (m.type === 'step') traverse(m);
            });
        }
    };

    traverse(result.steps);

    const finalInventory = currentInventory
        .filter(item => !itemsToRemove.has(item.id))
        .map(item => itemsToSetToZero.has(item.id) ? { ...item, count: 0 } : item);

    // Create the final product and add it to inventory
    const finalProduct: UserInventoryDeviant = {
        id: Math.random().toString(36).substr(2, 9),
        abnormalityId: targetAbnormalityId,
        ability: 5,
        activity: 5,
        traits: [...selectedTraitIds],
        count: 1
    };

    setInventory([finalProduct, ...finalInventory]);
    setResult(null);
    alert("庫存資產已扣除！已自動消耗中間材料、將父母胚次數置為 0，並將合成出的成品加入庫存。");
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
                <Sword size={28} className="rotate-45" />
            </div>
            {t('title')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl">{t('description')}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
            <button 
                onClick={() => {
                    const blob = new Blob([JSON.stringify(inventory, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'deviant_inventory_backup.json';
                    a.click();
                    URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
            >
                <ExternalLink size={16} />
                {t('exportInventory')}
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-bold hover:bg-gray-200 cursor-pointer transition-colors">
                <Plus size={16} />
                {t('importInventory')}
                <input 
                    type="file" 
                    className="hidden" 
                    accept=".json"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (re) => {
                            try {
                                const imported = JSON.parse(re.target?.result as string);
                                if (Array.isArray(imported)) {
                                    setInventory(imported);
                                    alert("匯入成功！");
                                }
                            } catch (e) {
                                alert("檔案格式錯誤");
                            }
                        };
                        reader.readAsText(file);
                    }}
                />
            </label>
            <button 
                onClick={() => setIsInventoryOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-500 transition-all font-bold text-indigo-600 dark:text-indigo-400"
            >
                <Package size={20} />
                {t('openInventory')}
                <span className="ml-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-xs">
                    {inventory.length}
                </span>
            </button>
        </div>
      </motion.div>

      {/* Main Goal Configuration */}
      <section className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700 mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Settings2 size={16} />
                    {t('selectTarget')}
                </label>
                <div className="relative group">
                    <select 
                        value={targetAbnormalityId}
                        onChange={(e) => {
                            setTargetAbnormalityId(e.target.value);
                            setSelectedTraitIds([]); 
                        }}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all appearance-none font-bold text-lg"
                    >
                        {abnormalities.map(ab => (
                            <option key={ab.id} value={ab.id}>{ab.name} ({ab.type})</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-indigo-500 transition-colors" />
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={16} />
                    {t('selectTraits')} ({selectedTraitIds.length}/{targetAbnormality?.traitSlots || 0})
                </label>
                <div className="flex flex-wrap gap-2 p-3 min-h-[64px] bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <AnimatePresence>
                        {selectedTraitIds.map(tid => (
                            <motion.span 
                                key={tid} 
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm"
                            >
                                {traits.find(tr => tr.id === tid)?.name}
                                <button onClick={() => setSelectedTraitIds(selectedTraitIds.filter(id => id !== tid))}>
                                    <X size={14} />
                                </button>
                            </motion.span>
                        ))}
                    </AnimatePresence>
                    {selectedTraitIds.length < (targetAbnormality?.traitSlots || 0) && (
                        <TraitSelector 
                            traits={filteredAvailableTraits} 
                            onSelect={(t: Trait) => setSelectedTraitIds([...selectedTraitIds, t.id])}
                            selectedIds={selectedTraitIds}
                        />
                    )}
                </div>
            </div>
        </div>

        <button 
          onClick={handleSolve}
          disabled={loading}
          className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-black text-xl rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          {loading ? <RefreshCcw className="animate-spin" /> : <Calculator />}
          {t('solve')}
        </button>
      </section>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.section 
            key={result.isPossible ? 'possible' : 'impossible'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-12"
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Info className="text-indigo-500" />
                    {t('resultTitle')}
                </h2>
                {!result.isPossible && (
                    <span className="px-4 py-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-sm font-bold flex items-center gap-2">
                        <AlertCircle size={16} />
                        部分路徑 (缺失庫存)
                    </span>
                )}
            </div>

            {/* Missing Elements Summary (Requirement 4) */}
            {!result.isPossible && result.missingElements.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border-2 border-amber-100 dark:border-amber-900/20 rounded-3xl p-6">
                    <h3 className="font-black text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                        <Trash2 size={20} />
                        {t('missingSummary')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {result.missingElements.map((m: MissingRequirement, i: number) => (
                            <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900/30">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 text-amber-600 rounded-lg">
                                    <Package size={16} />
                                </div>
                                <div>
                                    <div className="font-bold text-sm">{m.name} <span className="text-[10px] opacity-60 uppercase">{m.type}</span></div>
                                    <div className="text-xs text-gray-500">{m.purpose}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="pb-12">
                <ResultNode 
                    node={result.steps} 
                    depth={0} 
                    t={t} 
                    abnormalities={abnormalities} 
                    traits={traits} 
                />
            </div>

            {result.isPossible && (
                <div className="flex justify-center pb-20">
                    <button 
                        onClick={handleDeduct}
                        className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center gap-3"
                    >
                        <Trash2 size={24} />
                        完成合成，扣除庫存資產
                    </button>
                </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Inventory Drawer (Requirement 1) */}
      <InventoryDrawer 
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        inventory={inventory}
        setInventory={setInventory}
        abnormalities={abnormalities}
        traits={traits}
        t={t}
      />
    </div>
  );
}

function InventoryDrawer({ isOpen, onClose, inventory, setInventory, abnormalities, traits, t }: any) {
    const handleAdd = () => {
        const newItem: UserInventoryDeviant = {
            id: Math.random().toString(36).substr(2, 9),
            abnormalityId: abnormalities[0].id,
            ability: 5,
            activity: 5,
            traits: [],
            count: 1
        };
        setInventory([newItem, ...inventory]);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white dark:bg-gray-900 z-[101] shadow-2xl flex flex-col"
                    >
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <h2 className="text-2xl font-black flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
                                    <Package size={28} />
                                    {t('inventoryTitle')}
                                </h2>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
                                    {inventory.length} 項儲存的異常物
                                </p>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                            <button 
                                onClick={handleAdd}
                                className="w-full py-4 border-2 border-dashed border-indigo-200 dark:border-indigo-900/50 rounded-2xl text-indigo-500 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 mb-6"
                            >
                                <Plus size={20} />
                                {t('addInventory')}
                            </button>

                            <div className="grid grid-cols-1 gap-4 pb-12">
                                {inventory.map((item: any) => (
                                    <InventoryItemCard 
                                        key={item.id}
                                        item={item}
                                        abnormalities={abnormalities}
                                        traits={traits}
                                        onUpdate={(updates: any) => setInventory(inventory.map((i: any) => i.id === item.id ? { ...i, ...updates } : i))}
                                        onRemove={() => setInventory(inventory.filter((i: any) => i.id !== item.id))}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

function InventoryItemCard({ item, abnormalities, traits, onUpdate, onRemove }: any) {
  const currentAb = abnormalities.find((a: any) => a.id === item.abnormalityId);

  const filteredTraitsForSpecies = useMemo(() => {
    if (!currentAb) return [];
    return traits.filter((trait: any) => {
        const type = currentAb.type;
        const name = currentAb.name;

        // Rule 1: boundSpecies match (exact name or type)
        if (trait.boundSpecies) {
            if (trait.boundSpecies === name) return true;
            if (trait.boundSpecies === type || trait.boundSpecies === `${type}型`) return true;
            return trait.boundSpecies === '造物/領地' && (type === '造物' || type === '領地');

        }
        
        // Rule 2 & 3: Category match or "通用"
        return trait.category === '通用' || trait.category === type;
    });
  }, [currentAb, traits]);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 group relative"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <select 
                        value={item.abnormalityId}
                        onChange={(e) => onUpdate({ abnormalityId: e.target.value, traits: [] })}
                        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2 font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                    {abnormalities.map((ab: any) => (
                        <option key={ab.id} value={ab.id}>{ab.name}</option>
                    ))}
                    </select>
                    
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase">合成次數</span>
                        <div className="flex gap-1">
                            {[1, 0].map(v => (
                                <button 
                                    key={v}
                                    onClick={() => onUpdate({ count: v })}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${item.count === v ? 'bg-indigo-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <button onClick={onRemove} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                    <Trash2 size={18} />
                </button>
            </div>

            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-black uppercase">能力</span>
                    <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(v => (
                            <button 
                                key={v}
                                onClick={() => onUpdate({ ability: v })}
                                className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${item.ability >= v ? 'bg-amber-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-black uppercase">活躍</span>
                    <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(v => (
                            <button 
                                key={v}
                                onClick={() => onUpdate({ activity: v })}
                                className={`w-6 h-6 rounded-md text-[10px] font-bold transition-all ${item.activity >= v ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">特性集 ({item.traits.length}/{currentAb?.traitSlots || 0})</span>
                </div>
                <div className="flex flex-wrap gap-2 p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 min-h-[44px]">
                    {item.traits.map((tid: string) => (
                        <span key={tid} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-gray-200 dark:border-gray-700">
                            {traits.find((tr: any) => tr.id === tid)?.name}
                            <button onClick={() => onUpdate({ traits: item.traits.filter((id: string) => id !== tid) })}>
                                <X size={10} />
                            </button>
                        </span>
                    ))}
                    {item.traits.length < (currentAb?.traitSlots || 0) && (
                        <TraitSelector 
                            traits={filteredTraitsForSpecies} 
                            onSelect={(t: any) => onUpdate({ traits: [...item.traits, t.id] })}
                            selectedIds={item.traits}
                            small
                        />
                    )}
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
}

function TraitSelector({ traits, onSelect, selectedIds, small }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTraits = useMemo(() => 
    traits.filter((t: any) => 
      !selectedIds.includes(t.id) && 
      (t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    ).slice(0, 15),
    [traits, selectedIds, search]
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 font-bold ${small ? 'px-2 py-1 text-[10px] bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500'} rounded-lg hover:bg-indigo-100 transition-colors border border-transparent hover:border-indigo-200`}
      >
        <Plus size={small ? 12 : 14} />
        添加特性
      </button>

      {isOpen && (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <input 
                        autoFocus
                        className="w-full p-2 text-sm bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="搜尋特性或類別..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {filteredTraits.map((t: any) => (
                    <button 
                        key={t.id}
                        onClick={() => { onSelect(t); setIsOpen(false); }}
                        className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors group flex flex-col gap-0.5"
                    >
                        <div className="font-bold text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{t.name}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{t.category}</div>
                    </button>
                    ))}
                    {filteredTraits.length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-xs italic">無相符特性</div>
                    )}
                </div>
            </div>
        </>
      )}
    </div>
  );
}

function ResultNode({ node, depth, t, abnormalities, traits }: any) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!node) return null;

  if (node.type === 'missing') {
      return (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 border-2 border-dashed border-red-200 dark:border-red-900/30 rounded-2xl flex flex-col gap-2">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 text-white rounded-lg">
                      <HelpCircle size={20} />
                  </div>
                  <div>
                      <div className="text-xs text-red-600 dark:text-red-400 font-black uppercase">缺少組件</div>
                      <div className="font-black text-lg text-red-700 dark:text-red-300">{node.requirement.name}</div>
                  </div>
              </div>
              <div className="text-xs text-red-500 font-bold italic ml-11">
                  原因: {node.requirement.purpose}
              </div>
          </div>
      );
  }

  // Mutation Material Rendering
  if (node.type === 'mutation_material') {
    return (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border-2 border-purple-200 dark:border-purple-900/20 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 text-white rounded-lg shadow-lg shadow-purple-200 dark:shadow-none">
                    <Settings2 size={20} />
                </div>
                <div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest">🛠️ 遊戲內準備材料</div>
                    <div className="font-black text-lg">{node.materialName}</div>
                </div>
            </div>
            <div className="px-3 py-1 bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-100 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-700">
                提供變異詞條：{node.traitName}
            </div>
        </div>
    );
  }

  if (node.type === 'inventory') {
    const ab = abnormalities.find((a: any) => a.id === node.abnormalityId);
    return (
      <div className={`p-5 bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-900/20 rounded-2xl flex items-center justify-between shadow-sm`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200 dark:shadow-none">
            <Package size={24} />
          </div>
          <div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{t('inventoryItem')}</div>
            <div className="font-black text-xl flex items-center gap-2">
                {ab?.name}
                <span className="text-xs bg-emerald-200 dark:bg-emerald-800 px-2 py-0.5 rounded text-emerald-800 dark:text-emerald-100">{node.ability},{node.activity}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5 max-w-[200px]">
           {node.traitIds?.map((tid: string) => (
             <span key={tid} className="px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100 rounded-lg text-[10px] font-bold border border-emerald-300 dark:border-emerald-700">
               {traits.find((tr: any) => tr.id === tid)?.name || tid}
             </span>
           ))}
        </div>
      </div>
    );
  }

  const step = node.step;
  const ab = abnormalities.find((a: any) => a.id === step.target.abnormalityId);

  return (
    <div className="space-y-4">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`p-5 rounded-3xl cursor-pointer transition-all border-2 shadow-sm ${step.isPartial ? 'bg-amber-50 dark:bg-amber-900/5 border-amber-200 dark:border-amber-900/30' : 'bg-indigo-50 dark:bg-indigo-900/5 border-indigo-100 dark:border-indigo-900/20'} hover:scale-[1.01]`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 text-white rounded-xl shadow-lg ${step.isPartial ? 'bg-amber-500 shadow-amber-200' : 'bg-indigo-500 shadow-indigo-200'} dark:shadow-none`}>
              <RefreshCcw size={24} className={isExpanded ? '' : 'rotate-180 transition-transform'} />
            </div>
            <div>
              <div className={`text-[10px] font-black uppercase tracking-widest ${step.isPartial ? 'text-amber-600' : 'text-indigo-600'}`}>{t('fusionFormula')}</div>
              <div className="font-black text-2xl flex items-center gap-2">
                  {ab?.name}
                  <span className="text-xs bg-indigo-200 dark:bg-indigo-800 px-2 py-0.5 rounded text-indigo-800 dark:text-indigo-100">{step.target.ability},{step.target.activity}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-wrap gap-1.5 max-w-[250px]">
               {step.target.traitIds.map((tid: string) => (
                 <span key={tid} className="px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold border border-gray-200 dark:border-gray-700">
                   {traits.find((tr: any) => tr.id === tid)?.name}
                 </span>
               ))}
            </div>
            {isExpanded ? <ChevronDown size={28} /> : <ChevronRight size={28} />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden pl-6 md:pl-12 border-l-4 border-dashed border-gray-200 dark:border-gray-800 ml-8 space-y-8 pb-4"
          >
            <div className="space-y-6">
              <div className="relative">
                <div className="absolute -left-[30px] top-6 w-6 h-0.5 bg-gray-200 dark:bg-gray-800"></div>
                <div className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    {t('leftParent')}
                </div>
                <ResultNode node={step.left} depth={depth + 1} t={t} abnormalities={abnormalities} traits={traits} />
              </div>
              
              <div className="relative">
                <div className="absolute -left-[30px] top-6 w-6 h-0.5 bg-gray-200 dark:bg-gray-800"></div>
                <div className="text-[10px] font-black text-gray-400 uppercase mb-3 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                    {t('rightParent')}
                </div>
                <ResultNode node={step.right} depth={depth + 1} t={t} abnormalities={abnormalities} traits={traits} />
              </div>

              {step.mids.length > 0 && (
                <div className="space-y-3 relative">
                  <div className="absolute -left-[30px] top-6 w-6 h-0.5 bg-gray-200 dark:bg-gray-800"></div>
                  <div className="text-[10px] font-black text-gray-400 uppercase">{t('midIngredients')}</div>
                  <div className="space-y-2">
                    {step.mids.map((midNode: any, idx: number) => (
                      <ResultNode key={idx} node={midNode} depth={depth + 1} t={t} abnormalities={abnormalities} traits={traits} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
