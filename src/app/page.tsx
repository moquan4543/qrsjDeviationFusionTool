
'use client';

import React from 'react';
import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { Package, Sword, Search, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const item: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };


  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-3xl px-4"
      >
        <motion.div variants={item} className="mb-4 inline-block px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium border border-indigo-100 dark:border-indigo-800">
          Once Human Fusion Planner V1.0
        </motion.div>
        
        <motion.h1 variants={item} className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
          探索異常物的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-emerald-500">合成路徑</span>
        </motion.h1>
        
        <motion.p variants={item} className="text-lg text-gray-500 dark:text-gray-400 mb-10 leading-relaxed max-w-2xl mx-auto">
          專為非正常收容玩家設計的輔助工具。幫助查詢異常物資訊、瀏覽技能效果，透過提純工具找到理想的合成目標。若有任何問題與建議，歡迎加入 DC 群討論
        </motion.p>

        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <Link href="/deviations" className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-indigo-500/30 transition-all flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-1">異常物百科</h3>
            <p className="text-xs text-gray-400 text-center">查詢所有異常物、主技能與可掌握技能</p>
          </Link>

          <Link href="/skills" className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sword className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-1">技能庫</h3>
            <p className="text-xs text-gray-400 text-center">查看詳細技能描述與冷卻時間</p>
          </Link>

          <Link href="/filter" className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-1">提純工具</h3>
            <p className="text-xs text-gray-400 text-center">精確篩選所需技能，排除不想要的目標</p>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/filter" className="inline-flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-8 py-3 rounded-full font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
            立即開始 <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
